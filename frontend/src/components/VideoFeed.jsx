import React, { useState } from 'react';

export function VideoFeed({
  videoUrl = 'http://127.0.0.1:5000/video',
  isConnected = false,
  cameraName,
  deploymentMode,
}) {
  const [hasVideoError, setHasVideoError] = useState(false);
  const feedLabel = cameraName || 'Live camera';
  const streamProfile = deploymentMode ? `${deploymentMode.toUpperCase()} stream` : 'Live stream';

  return (
    <div className="relative w-full h-full min-h-[400px] glass-card overflow-hidden border ghost-border group">
      <div className="absolute top-4 left-4 flex space-x-2 z-10">
        <div className="glass-float px-3 py-1 flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-error animate-pulse' : 'bg-on-surface-variant'}`}></div>
          <span className="text-[10px] font-bold tracking-widest text-white uppercase">{`REC: ${feedLabel}`}</span>
        </div>
        <div className="glass-float px-3 py-1">
          <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{streamProfile}</span>
        </div>
      </div>

      <div className="w-full h-full bg-surface-container-low flex items-center justify-center p-2">
        <div className="relative w-full h-full max-h-[480px] rounded-lg overflow-hidden border border-surface-variant">
          <img
            src={videoUrl}
            alt="Live Camera Feed"
            className={`w-full h-full object-cover ${hasVideoError ? 'hidden' : 'block'}`}
            onError={() => setHasVideoError(true)}
            onLoad={() => setHasVideoError(false)}
          />

          <div className={`${hasVideoError ? 'flex' : 'hidden'} flex-col items-center justify-center text-on-surface-variant`}>
            <p className="text-sm font-medium tracking-widest uppercase">{isConnected ? 'Camera Warmup In Progress' : 'Video Signal Lost'}</p>
            <p className="text-xs text-primary/50 mt-1 uppercase">{isConnected ? 'Waiting For First Frame...' : 'Awaiting Connection...'}</p>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-b from-transparent via-primary to-transparent h-[10px] w-full animate-[scan_3s_ease-in-out_infinite]"></div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: -10px; }
          100% { top: 100%; }
        }
      ` }} />
    </div>
  );
}
