import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Upload, Search, User, LogOut, Shield, Settings } from 'lucide-react';
import Login from './Login';
import Register from './Register';
import UserProfile from './UserProfile';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
}

export default function Navbar({ onNavigate, currentPage }: NavbarProps) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('browse');
  };

  return (
    <>
      <nav className="bg-[#1f293b] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => onNavigate('browse')}
                className="text-xl font-bold text-white hover:text-blue-600 transition"
              >
                Texture Hub
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => onNavigate('browse')}
                className={`flex items-center px-3 py-2 rounded-md transition ${
                  currentPage === 'browse'
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-white hover:bg-gray-700'
                }`}
              >
                <Search className="w-5 h-5 mr-2" />
                Browse
              </button>

              {user && (
                <button
                  onClick={() => onNavigate('upload')}
                  className={`flex items-center px-3 py-2 rounded-md transition ${
                    currentPage === 'upload'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`flex items-center px-3 py-2 rounded-md transition ${
                    currentPage === 'admin'
                      ? 'bg-blue-100 text-blue-600'
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Admin
                </button>
              )}

              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-white">
                    {profile?.username}
                    {profile?.rank === 'admin' && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">
                        Admin
                      </span>
                    )}
                    {profile?.rank === 'certified_maker' && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                        Certified
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setShowUserProfile(true)}
                    className="flex items-center px-3 py-2 text-white hover:bg-gray-700 rounded-md transition"
                    title="Edit Profile"
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center px-3 py-2 text-white hover:bg-gray-700 rounded-md transition"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-4 py-2 text-white hover:bg-gray-700 rounded-md transition"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setShowRegister(true)}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 hover:text-gray-900"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button
                onClick={() => {
                  onNavigate('browse');
                  setMobileMenuOpen(false);
                }}
                className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                <Search className="w-5 h-5 mr-2" />
                Browse
              </button>

              {user && (
                <button
                  onClick={() => {
                    onNavigate('upload');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    onNavigate('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Admin
                </button>
              )}

              {user ? (
                <div className="border-t pt-2 mt-2">
                  <div className="px-3 py-2 text-sm text-gray-600">
                    {profile?.username}
                    {profile?.rank === 'admin' && (
                      <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                        Admin
                      </span>
                    )}
                    {profile?.rank === 'certified_maker' && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                        Certified
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setShowUserProfile(true);
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    <Settings className="w-5 h-5 mr-2" />
                    Edit Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="border-t pt-2 mt-2 space-y-1">
                  <button
                    onClick={() => {
                      setShowLogin(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-white hover:bg-gray-700 rounded-md"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowRegister(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md"
                  >
                    Register
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {showLogin && (
        <Login
          onClose={() => setShowLogin(false)}
          onSwitchToRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
          }}
        />
      )}

      {showRegister && (
        <Register
          onClose={() => setShowRegister(false)}
          onSwitchToLogin={() => {
            setShowRegister(false);
            setShowLogin(true);
          }}
        />
      )}

      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </>
  );
}
