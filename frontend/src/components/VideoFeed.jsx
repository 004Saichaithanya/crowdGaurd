import React from 'react';

export function VideoFeed() {
  return (
    <div className="relative w-full h-full min-h-[400px] glass-card overflow-hidden border ghost-border group">
      {/* Top Bar Video Stats */}
      <div className="absolute top-4 left-4 flex space-x-2 z-10">
        <div className="glass-float px-3 py-1 flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
          <span className="text-[10px] font-bold tracking-widest text-white uppercase">REC: CAM_STATION_04</span>
        </div>
        <div className="glass-float px-3 py-1">
          <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">4K HDR • 60 FPS</span>
        </div>
      </div>

      {/* Actual Feed (Using Flask multipart stream or fallback) */}
      <div className="w-full h-full bg-surface-container-low flex items-center justify-center">
        {/* If the user has the backend running, we can load the image. Otherwise fallback */}
        <img 
          src="http://127.0.0.1:5000/video" 
          alt="Live Camera Feed"
          className="w-full h-full object-cover opacity-80 mix-blend-screen"
          onError={(e) => {
            e.target.style.display = 'none';
            document.getElementById('fallback-video').style.display = 'flex';
          }}
        />
        
        {/* Fallback if backend is down */}
        <div id="fallback-video" className="hidden flex-col items-center justify-center text-on-surface-variant">
           <p className="text-sm font-medium tracking-widest uppercase">Video Signal Lost</p>
           <p className="text-xs text-primary/50 mt-1 uppercase">Awaiting Connection...</p>
        </div>
      </div>

      {/* Decorative scanning line animation */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-gradient-to-b from-transparent via-primary to-transparent h-[10px] w-full animate-[scan_3s_ease-in-out_infinite]"></div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: -10px; }
          100% { top: 100%; }
        }
      `}} />
    </div>
  );
}
