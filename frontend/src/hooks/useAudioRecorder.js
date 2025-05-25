import { useRef, useState } from 'react';

export function useAudioRecorder({ onChunk, onStop, onStart }) {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunkTimerRef = useRef(null);
  const manuallyStoppedRef = useRef(false);
  const hasStartedOnceRef = useRef(false);
  const storedModeRef = useRef('mic');
  const storedStreamRef = useRef(null);

  // New refs for mic and tab-specific cleanup
  const micStreamRef = useRef(null);
  const tabStreamRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);

  const start = async (mode = 'mic') => {
    manuallyStoppedRef.current = false;
    storedModeRef.current = mode;

    try {
      if (!hasStartedOnceRef.current) {
        let stream;

        if (mode === 'tab') {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const tabStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

          micStreamRef.current = micStream;
          tabStreamRef.current = tabStream;

          const audioContext = new AudioContext();
          const destination = audioContext.createMediaStreamDestination();

          audioContext.createMediaStreamSource(micStream).connect(destination);
          audioContext.createMediaStreamSource(tabStream).connect(destination);

          stream = destination.stream;
        } else {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStreamRef.current = micStream;
          stream = micStream;
        }

        streamRef.current = new MediaStream(stream.getAudioTracks());
        storedStreamRef.current = streamRef.current;
      }

      const stream = storedStreamRef.current;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const blob = new Blob([event.data], { type: 'audio/webm' });
          console.log('🎤 Chunk emitted, size:', blob.size);
          onChunk(blob);
        }
      };

      mediaRecorder.onstop = () => {
        if (!manuallyStoppedRef.current) {
          chunkTimerRef.current = setTimeout(() => {
            start(storedModeRef.current);
          }, 100);
        }

        if (manuallyStoppedRef.current && onStop) onStop();
      };

      mediaRecorder.onstart = () => {
        if (!hasStartedOnceRef.current) {
          if (onStart) onStart();
          hasStartedOnceRef.current = true;
        }

        chunkTimerRef.current = setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 10000);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      stop(); // cleanup
    }
  };

  const stop = () => {
    manuallyStoppedRef.current = true;

    if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // Stop and cleanup all streams
    [micStreamRef.current, tabStreamRef.current, streamRef.current].forEach((stream) => {
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (err) {
            console.warn('⚠️ Failed to stop track:', err);
          }
        });
      }
    });

    micStreamRef.current = null;
    tabStreamRef.current = null;
    streamRef.current = null;
    storedStreamRef.current = null;

    hasStartedOnceRef.current = false;
    setIsRecording(false);
  };

  return { start, stop, isRecording };
}
