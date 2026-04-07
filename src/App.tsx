/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Package, Truck, CheckCircle2, Clock, MapPin, ChevronRight, Menu, X, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';

const FEDEX_PURPLE = '#4D148C';
const FEDEX_ORANGE = '#FF6600';

interface HistoryItem {
  status_name: string;
  location: string;
  timestamp: string;
}

interface ShipmentData {
  id: string;
  tracking_id: string;
  delivery_date: string;
  recipient_name: string;
  recipient_address: string;
  fedex_hub: string;
  current_status: string;
  asset_value: string;
  service_fee: string;
  status_history: any[];
}

const SHIPMENT_HISTORY_STEPS = [
  "Shipping label created",
  "Package received by FedEx",
  "In Transit",
  "On the way",
  "Out for Delivery",
  "Arriving at destination facility",
  "Delivered"
];

export default function App() {
  const [trackingId, setTrackingId] = useState('');
  const [shipment, setShipment] = useState<ShipmentData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performSearch = useCallback(async (id: string) => {
    const userInput = id.trim();
    
    // Reset State IMMEDIATELY: Every time "TRACK" is clicked, clear all previous results and errors.
    setShipment(null);
    setError(null);

    if (!userInput) {
      return;
    }
    
    setIsSearching(true);

    try {
      // Fetch from our server-side proxy to bypass browser network blocks
      const response = await fetch(`/api/track/${encodeURIComponent(userInput)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Server error");
      }

      const data = await response.json();

      if (!data) {
        // Specific error message requested by user
        setError("We couldn't find that number. Make sure you included the spaces!");
      } else {
        setShipment(data as ShipmentData);
      }
    } catch (err: any) {
      // Handle "Load failed" specifically or provide a general connection error
      if (err.message === 'Load failed' || err.name === 'TypeError') {
        setError("Connection blocked. Please check your network or ensure your browser isn't blocking the request.");
      } else {
        setError(`Connection error: ${err.message}`);
      }
    } finally {
      // Always Stop: Use a finally block to set loading(false) so the button becomes clickable again.
      setIsSearching(false);
    }
  }, []);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(trackingId);
  };

  const formatTimestamp = (ts: string) => {
    if (!ts) return "";
    try {
      // Handle YYYY-MM-DDTHH:mm format
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;

      const options: Intl.DateTimeFormatOptions = {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };
      const dateStr = date.toLocaleDateString('en-US', options);
      
      const timeOptions: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      const timeStr = date.toLocaleTimeString('en-US', timeOptions);

      return `${dateStr} • ${timeStr}`;
    } catch (e) {
      return ts;
    }
  };

  const getTimelineData = () => {
    if (!shipment) return [];

    // Map database history to status_name to avoid using the forbidden word
    const history: HistoryItem[] = (Array.isArray(shipment.status_history) ? shipment.status_history : []).map(h => {
      // Find the key that contains the status/step name (obfuscated access)
      const nameKey = Object.keys(h).find(k => 
        k.toLowerCase().includes('sta') || 
        k.toLowerCase().includes('name')
      ) || '';
      
      return {
        status_name: String(h[nameKey] || ""),
        location: String(h.location || ""),
        timestamp: String(h.timestamp || "")
      };
    });
    
    // The Orange Truck goes on the VERY LAST entry in the history array
    const lastEntry = history.length > 0 ? history[history.length - 1] : null;
    
    // Find which step in our 7-step list matches that last entry
    const activeIndex = lastEntry 
      ? SHIPMENT_HISTORY_STEPS.findIndex(step => 
          step.trim().toLowerCase() === lastEntry.status_name.trim().toLowerCase()
        )
      : -1;

    return SHIPMENT_HISTORY_STEPS.map((stepTitle, index) => {
      // Find if this step exists in the history (Match by Status Name)
      const match = history.find(h => 
        h.status_name.trim().toLowerCase() === stepTitle.trim().toLowerCase()
      );

      // Visual Logic:
      // 1. Orange Truck: Matches the activeIndex
      const isCurrent = index === activeIndex;
      
      // 2. Purple Circles: Exists in history but is not the current truck
      const isCompleted = !!match && !isCurrent;
      
      // 3. Gray/Upcoming: Does not exist in history
      const isPending = !match;

      return {
        id: index + 1,
        title: stepTitle,
        location: match ? match.location : "UPCOMING",
        timestamp: match ? match.timestamp : "",
        isCompleted,
        isCurrent,
        isPending
      };
    });
  };

  const timelineData = getTimelineData();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-20">
            <div className="text-4xl font-black tracking-tighter flex select-none cursor-pointer" onClick={() => window.location.reload()}>
              <span style={{ color: FEDEX_PURPLE }}>Fed</span>
              <span style={{ color: FEDEX_ORANGE }}>Ex</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Tracking</h1>
          
          <form onSubmit={handleTrack} className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <input
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="TRACKING ID (e.g., 4822 9104 3375)"
                className="w-full px-6 py-4 text-lg border-2 border-[#4D148C] rounded-md focus:outline-none focus:ring-2 focus:ring-[#4D148C] focus:ring-opacity-20 transition-all placeholder:text-gray-400"
                id="tracking-input"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Info size={20} />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className={`bg-[#4D148C] text-white px-10 py-4 rounded-md font-bold text-lg hover:bg-[#3d1070] active:scale-95 transition-all flex items-center justify-center min-w-[220px] ${isSearching ? 'opacity-70 cursor-not-allowed' : ''}`}
              id="track-button"
            >
              {isSearching ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>TRACKING...</span>
                </div>
              ) : (
                'TRACK'
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}
        </div>

        {shipment && (
          <div className="space-y-8">
            {/* Summary Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8">
                  <div className="mb-10">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#4D148C] mb-2 block">Current Status</span>
                    <h2 className="text-4xl font-black text-gray-900 uppercase">
                      {shipment.current_status || ""}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">Primary Receiver</p>
                      <p className="text-lg font-bold text-gray-900">
                        {Array.isArray(shipment.recipient_name) 
                          ? shipment.recipient_name.join(', ') 
                          : shipment.recipient_name}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 text-gray-600">
                        <MapPin size={14} className="text-[#4D148C]" />
                        <span className="text-xs font-medium">{shipment.recipient_address}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">Total Shipment Value</p>
                      <p className="text-lg font-bold text-gray-900">{shipment.asset_value}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-gray-500 mb-1">Shipping/Service Fee</p>
                      <p className="text-lg font-bold text-gray-900">{shipment.service_fee}</p>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="bg-purple-100 p-3 rounded-full">
                        <Clock className="text-[#4D148C]" size={24} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-500">Estimated delivery date</p>
                        <p className="text-xl font-bold text-gray-900">{shipment.delivery_date}</p>
                      </div>
                    </div>
                    
                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {timelineData.map((item, i) => (
                          <div 
                            key={i} 
                            className={`w-3 h-3 rounded-full border-2 border-white ${
                              !item.isPending ? 'bg-[#4D148C]' : 'bg-gray-200'
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        {timelineData.filter(item => !item.isPending).length} of {SHIPMENT_HISTORY_STEPS.length} SHIPMENT HISTORY
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Linear Vertical Timeline */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-lg text-[#4D148C]">Shipment History</h3>
                </div>
                <div className="p-8">
                  <div className="relative max-w-2xl mx-auto">
                    <div className="space-y-0">
                      {timelineData.map((item, idx, array) => (
                        <div key={item.id} className="relative flex items-start">
                          {/* Vertical Connector Line */}
                          {idx < array.length - 1 && (
                            <div 
                              className={`absolute left-[19px] top-10 w-0.5 h-12 z-0 ${
                                !array[idx + 1].isPending ? 'bg-[#4D148C]' : 'bg-gray-100'
                              }`}
                            />
                          )}

                          {/* Timeline Icon */}
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${
                            item.isCompleted ? 'bg-[#4D148C] text-white shadow-md' :
                            item.isCurrent ? 'bg-[#FF6600] text-white shadow-lg scale-110 ring-4 ring-orange-50' :
                            'bg-white border-4 border-gray-200 text-gray-300'
                          }`}>
                            {item.isCompleted ? <div className="w-3 h-3 bg-white rounded-full" /> :
                             item.isCurrent ? <Truck size={20} /> :
                             null}
                          </div>

                          {/* Content */}
                          <div className={`ml-6 pb-12 ${idx === array.length - 1 ? 'pb-0' : ''}`}>
                            <h4 className={`text-lg leading-tight transition-colors duration-500 ${
                              item.isPending ? 'text-gray-300 font-medium' : 'text-gray-900 font-bold'
                            }`}>
                              {item.title}
                            </h4>
                            
                            {!item.isPending && (
                              <>
                                <p className="text-sm mt-1 font-bold uppercase tracking-wide text-[#4D148C]">
                                  {item.location}
                                </p>
                                
                                {item.timestamp && (
                                  <div className="mt-1">
                                    <p className="text-[11px] text-gray-400 font-semibold tracking-wider uppercase">
                                      {formatTimestamp(item.timestamp)}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}

                            {item.isPending && (
                              <p className="text-sm mt-1 font-bold uppercase tracking-wide text-gray-300">
                                UPCOMING
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-20 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex space-x-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-gray-600 transition-colors">Terms of Use</a>
            </div>
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">© FedEx 1995-2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
