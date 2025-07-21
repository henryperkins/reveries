import React, { useState } from 'react';
import { Menu, X, Activity, Archive, BarChart2, Settings, User } from 'lucide-react';

interface TopNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ activeTab, onTabChange }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const tabs = [
    { id: 'research', label: 'Research', icon: Activity },
    { id: 'sessions', label: 'Sessions', icon: Archive },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Reverie Engine
              </h1>
              
              <div className="hidden md:flex ml-10 space-x-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange(tab.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                        activeTab === tab.id
                          ? 'bg-amber-100 text-amber-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <User className="w-5 h-5 text-gray-600" />
              </button>
              
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                {showMobileMenu ? (
                  <X className="w-6 h-6 text-gray-600" />
                ) : (
                  <Menu className="w-6 h-6 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {showMobileMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-3 ${
                      activeTab === tab.id
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};