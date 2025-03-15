# Barbaros Voice Command Server
import aiohttp
from aiohttp import web
import numpy as np
from openwakeword import Model
import resampy
import argparse
import json
import io
import wave
import os
import logging
import asyncio
from openai import OpenAI

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("barbaros_voice")

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Buffer for storing audio after wake word detection
class AudioBuffer:
    def __init__(self, sample_rate=16000, max_recording_seconds=3):  # Default to 3 seconds now
        self.sample_rate = sample_rate
        self.data = []
        self.is_recording = False
        self.max_recording_seconds = max_recording_seconds
        self.max_samples = self.max_recording_seconds * sample_rate
        self.cooldown_until = 0  # Timestamp for cooldown period

    def start_recording(self):
        self.is_recording = True
        self.data = []  # Clear the buffer when starting
        logger.info("Started recording")

    def stop_recording(self):
        self.is_recording = False
        logger.info(f"Stopped recording, captured {len(self.data)} samples")
        return self.get_audio()

    def add_data(self, audio_data):
        if self.is_recording:
            self.data.extend(audio_data)
            # Stop recording if we've reached max length
            if len(self.data) > self.max_samples:
                return self.stop_recording()
        return None

    def get_audio(self):
        if not self.data:
            return None
        return np.array(self.data, dtype=np.int16)

# Intent recognition using OpenAI
async def recognize_intent(text):
    """Recognize boat navigation intent from transcribed text"""
    prompt = f"""
You are an assistant that interprets boat navigation commands into structured data.
Parse this command for boat navigation: "{text}"
Commands should be categorized as one of:
- turn_starboard: Turn right X degrees
- turn_port: Turn left X degrees
- speed_up: Increase speed by X knots
- slow_down: Decrease speed by X knots
- start_engine: Start the boat engine
- stop_engine: Stop the boat engine
- drop_anchor: Lower the anchor
- raise_anchor: Raise the anchor

For commands involving degrees or knots, extract the numeric value.
Return a JSON object with "command" and "value" (as a number). If no value was specified, place 1 as default.
If no valid command is detected, return {{"command": "unknown"}}
"""
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You only respond with valid JSON objects based on user inputs."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150
        )
        
        intent_text = response.choices[0].message.content.strip()
        logger.info(f"Intent recognition response: {intent_text}")
        
        # Try to parse the JSON
        try:
            intent_data = json.loads(intent_text)
            return intent_data
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse intent JSON: {intent_text}")
            return {"command": "unknown", "error": "Failed to parse response"}
            
    except Exception as e:
        logger.error(f"Error in intent recognition: {e}")
        return {"command": "unknown", "error": str(e)}

# Transcribe audio using OpenAI Whisper API
async def transcribe_audio(audio_data, sample_rate=16000):
    """Transcribe audio using OpenAI Whisper API"""
    try:
        # Convert to WAV format for the API
        with io.BytesIO() as wav_buffer:
            with wave.open(wav_buffer, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                wf.writeframes(audio_data.tobytes())
            wav_buffer.seek(0)
            
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=("audio.wav", wav_buffer),
                language="en"
            )
            
            transcription = response.text
            logger.info(f"Transcription result: {transcription}")
            return transcription
    except Exception as e:
        logger.error(f"Error in transcription: {e}")
        return None

# Define websocket handler for microphone data
async def mic_websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    # Store microphone websocket connections
    if not hasattr(request.app, 'mic_websockets'):
        request.app.mic_websockets = []
    request.app.mic_websockets.append(ws)
    
    # Get the audio buffer ready
    audio_buffer = AudioBuffer()
    sample_rate = 16000  # Default sample rate
    
    # Send loaded models
    await ws.send_str(json.dumps({"type": "models", "data": list(request.app['oww_model'].models.keys())}))

    try:
        # Start listening for websocket messages
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                try:
                    # Check if this is the sample rate message
                    data = msg.data
                    if data.isdigit():
                        sample_rate = int(data)
                        audio_buffer = AudioBuffer(sample_rate)
                        logger.info(f"Set sample rate to {sample_rate}")
                    elif data == "stop_recording":
                        if audio_buffer.is_recording:
                            audio_data = audio_buffer.stop_recording()
                            if audio_data is not None:
                                # Transcribe and recognize intent
                                transcription = await transcribe_audio(audio_data, sample_rate)
                                if transcription:
                                    await ws.send_str(json.dumps({
                                        "type": "transcription", 
                                        "data": transcription
                                    }))
                                    
                                    # Recognize intent
                                    intent = await recognize_intent(transcription)
                                    
                                    # Add default values for commands if needed
                                    if intent and intent.get("command") != "unknown" and "value" not in intent:
                                        if intent["command"] == "speed_up" or intent["command"] == "slow_down":
                                            intent["value"] = 1  # Default 1 knot
                                        elif intent["command"] == "turn_port" or intent["command"] == "turn_starboard":
                                            intent["value"] = 1  # Default 1 degree
                                    
                                    # Send intent to the client
                                    await ws.send_str(json.dumps({
                                        "type": "intent", 
                                        "data": intent
                                    }))
                                    
                                    # Also broadcast to any connected boat apps
                                    await broadcast_command(request.app, intent)
                                    
                                    # Set cooldown period (3 seconds) to prevent immediate re-detection
                                    audio_buffer.cooldown_until = asyncio.get_event_loop().time() + 3
                except ValueError:
                    logger.warning(f"Received unrecognized text message: {msg.data}")
            
            elif msg.type == aiohttp.WSMsgType.BINARY:
                # Get audio data from websocket
                audio_bytes = msg.data
                
                # Add extra bytes of silence if needed (for alignment)
                if len(msg.data) % 2 == 1:
                    audio_bytes += b'\x00'
                
                # Convert audio to correct format and sample rate
                data = np.frombuffer(audio_bytes, dtype=np.int16)
                if sample_rate != 16000:
                    data = resampy.resample(data, sample_rate, 16000)
                
                # First check if we're already recording
                if audio_buffer.is_recording:
                    result = audio_buffer.add_data(data)
                    if result is not None:
                        # We stopped recording due to max length
                        transcription = await transcribe_audio(result, 16000)
                        if transcription:
                            await ws.send_str(json.dumps({
                                "type": "transcription", 
                                "data": transcription
                            }))
                            
                            # Recognize intent
                            intent = await recognize_intent(transcription)
                            
                            # Add default values for commands if needed
                            if intent and intent.get("command") != "unknown" and "value" not in intent:
                                if intent["command"] == "speed_up" or intent["command"] == "slow_down":
                                    intent["value"] = 1  # Default 1 knot
                                elif intent["command"] == "turn_port" or intent["command"] == "turn_starboard":
                                    intent["value"] = 1  # Default 1 degree
                            
                            await ws.send_str(json.dumps({
                                "type": "intent", 
                                "data": intent
                            }))
                            
                            # Also broadcast to any connected boat apps
                            await broadcast_command(request.app, intent)
                            
                            # Set cooldown period (3 seconds) to prevent immediate re-detection
                            audio_buffer.cooldown_until = asyncio.get_event_loop().time() + 3
                else:
                    # Check for wake word - but only if we're not in cooldown period
                    current_time = asyncio.get_event_loop().time()
                    if current_time > audio_buffer.cooldown_until:
                        predictions = request.app['oww_model'].predict(data)
                        
                        activations = []
                        for key in predictions:
                            if predictions[key] >= 0.5:  # Threshold for activation
                                activations.append(key)
                        
                        if activations:
                            # Send activation to mic client
                            await ws.send_str(json.dumps({
                                "type": "activations", 
                                "data": activations
                            }))
                            
                            # Also broadcast wake word detection to boat clients
                            await broadcast_wake_word(request.app, activations)
                            
                            # Start recording
                            audio_buffer.start_recording()
                        
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error(f"WebSocket error: {ws.exception()}")
    finally:
        # Remove the connection from the list
        if hasattr(request.app, 'mic_websockets') and ws in request.app.mic_websockets:
            request.app.mic_websockets.remove(ws)
    
    return ws

# Define websocket handler for Barbaros app connections
async def boat_app_websocket_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    # Store boat app websocket connections
    if not hasattr(request.app, 'boat_websockets'):
        request.app.boat_websockets = []
    request.app.boat_websockets.append(ws)
    
    logger.info(f"Boat app connected. Total connections: {len(request.app.boat_websockets)}")
    
    try:
        async for msg in ws:
            if msg.type == aiohttp.WSMsgType.TEXT:
                # Handle any messages from the boat app
                # (Currently we don't expect any, but could be used for status updates)
                logger.info(f"Received from boat app: {msg.data}")
            elif msg.type == aiohttp.WSMsgType.ERROR:
                logger.error(f"Boat app WebSocket error: {ws.exception()}")
    finally:
        # Remove the connection when closed
        if hasattr(request.app, 'boat_websockets') and ws in request.app.boat_websockets:
            request.app.boat_websockets.remove(ws)
            logger.info(f"Boat app disconnected. Remaining connections: {len(request.app.boat_websockets)}")
    
    return ws

# Broadcast wake word detection to all connected boat apps
async def broadcast_wake_word(app, activations):
    if hasattr(app, 'boat_websockets') and app.boat_websockets:
        message = json.dumps({"type": "wake_word", "data": activations})
        tasks = [ws.send_str(message) for ws in app.boat_websockets if not ws.closed]
        if tasks:
            logger.info(f"Broadcasting wake word detection to {len(tasks)} boat app(s)")
            await asyncio.gather(*tasks, return_exceptions=True)

# Broadcast commands to all connected boat apps
async def broadcast_command(app, command):
    if hasattr(app, 'boat_websockets') and app.boat_websockets:
        message = json.dumps({"type": "command", "data": command})
        tasks = [ws.send_str(message) for ws in app.boat_websockets if not ws.closed]
        if tasks:
            logger.info(f"Broadcasting command to {len(tasks)} boat app(s): {command}")
            await asyncio.gather(*tasks, return_exceptions=True)

# Define static file handler
async def static_file_handler(request):
    return web.FileResponse('./voice-test-client.html')

# Create application and setup routes
app = web.Application()
app.add_routes([
    web.get('/mic', mic_websocket_handler),       # For microphone data
    web.get('/boat', boat_app_websocket_handler), # For boat app connections
    web.get('/', static_file_handler)             # For serving the HTML test page
])

if __name__ == '__main__':
    # Parse CLI arguments
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model_path",
        help="The path of a specific model to load",
        type=str,
        default="",
        required=False
    )
    parser.add_argument(
        "--inference_framework",
        help="The inference framework to use (either 'onnx' or 'tflite')",
        type=str,
        default='onnx',  # Set default to onnx instead of tflite
        required=False
    )
    parser.add_argument(
        "--port",
        help="Port to run the server on",
        type=int,
        default=9000,
        required=False
    )
    args = parser.parse_args()
    
    # Check for OpenAI API key
    if not os.environ.get("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY environment variable is not set. ASR and intent recognition will not work.")
    
    # Load openWakeWord models
    if args.model_path != "":
        oww_model = Model(wakeword_models=[args.model_path], inference_framework=args.inference_framework)
    else:
        oww_model = Model(inference_framework=args.inference_framework)
    
    # Store model in app state
    app['oww_model'] = oww_model
    
    # Store websocket connections list
    app.mic_websockets = []
    app.boat_websockets = []
    
    # Start webapp
    web.run_app(app, host='localhost', port=args.port)
