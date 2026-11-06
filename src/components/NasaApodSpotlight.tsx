import React, { useState, useEffect } from 'react';
import { ApodData, fetchApod } from '../services/nasaApi';
import { Sparkles, Calendar, User, ExternalLink, RefreshCw, Eye } from 'lucide-react';

export const NasaApodSpotlight: React.FC = () => {
  const [apod, setApod] = useState<ApodData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const loadApod = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApod();
      if (data) {
        setApod(data);
      } else {
        setError('NASA APOD service is temporarily offline');
      }
    } catch (err: any) {
      setError(err?.message || 'Error loading APOD');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApod();
  }, []);

  return (
    <div className="bg-[#0B0E17] border border-slate-800 rounded-lg overflow-hidden flex flex-col">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>NASA Daily Feature</span>
            <span aria-hidden="true">·</span>
            <span>Astronomy Picture of the Day</span>
            <span aria-hidden="true">·</span>
            <span>{apod?.date || 'UTC Today'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mt-0.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            NASA APOD Spotlight
          </h2>
        </div>

        <button
          onClick={loadApod}
          disabled={loading}
          className="p-1.5 bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded transition-colors disabled:opacity-50"
          title="Refresh APOD"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {loading && (
        <div className="py-16 text-center text-slate-400 font-mono text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
          Receiving transmission from NASA APOD archive...
        </div>
      )}

      {error && !loading && (
        <div className="p-6 text-center text-rose-400 font-mono text-xs">
          {error}
        </div>
      )}

      {!loading && apod && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Media frame */}
          <div className="lg:col-span-7 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 relative group">
            {apod.media_type === 'image' ? (
              <img
                src={apod.url}
                alt={apod.title}
                referrerPolicy="no-referrer"
                className="w-full h-80 lg:h-96 object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                  // Fallback container
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-80 lg:h-96 flex items-center justify-center bg-slate-900 text-slate-400 text-xs font-mono">
                [NASA Video Content: {apod.title}]
              </div>
            )}

            {/* Scrim overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent pointer-events-none" />

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-mono text-slate-300 pointer-events-auto">
              <span>{apod.copyright ? `Credit: ${apod.copyright}` : 'Public Domain NASA / STScI'}</span>
              {apod.hdurl && (
                <a
                  href={apod.hdurl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-slate-900/90 border border-slate-700 hover:border-cyan-500 rounded text-cyan-300 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  HD Source
                </a>
              )}
            </div>
          </div>

          {/* Descriptive text */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-3">
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
              Astrophysical Feature
            </div>
            <h3 className="text-lg font-bold text-slate-100 leading-snug">{apod.title}</h3>
            <p
              className={`text-xs text-slate-300 leading-relaxed ${
                isExpanded ? '' : 'line-clamp-6'
              }`}
            >
              {apod.explanation}
            </p>
            {apod.explanation.length > 250 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-mono text-cyan-400 hover:underline text-left self-start"
              >
                {isExpanded ? 'Show less' : 'Read full explanation →'}
              </button>
            )}

            <div className="pt-3 border-t border-slate-800 text-xs font-mono text-slate-500 flex items-center justify-between">
              <span>NASA Astronomy Picture of the Day</span>
              <a
                href="https://apod.nasa.gov/apod/astropix.html"
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
              >
                apod.nasa.gov
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
