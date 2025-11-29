import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Upload, Search, User, LogOut, Shield, Settings, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Login from './Login';
import Register from './Register';
import UserProfile from './UserProfile';
import SOF from '../assets/SOF.webp';

interface NavbarProps {
  onNavigate: (page: string) => void;
  currentPage: string;
  onViewProfile?: (username: string) => void;
}

export default function Navbar({ onNavigate, currentPage, onViewProfile }: NavbarProps) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminNotificationCount, setAdminNotificationCount] = useState(0);

  const fetchAdminNotificationCount = async () => {
    if (!isAdmin) return;

    try {
      const [pendingTexturesRes, pendingPacksRes, reportsRes, packReportsRes] = await Promise.all([
        supabase.from('textures').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('packs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
        supabase.from('pack_reports').select('*', { count: 'exact', head: true })
      ]);

      const pendingTexturesCount = pendingTexturesRes.count || 0;
      const pendingPacksCount = pendingPacksRes.count || 0;
      const reportsCount = reportsRes.count || 0;
      const packReportsCount = packReportsRes.count || 0;

      setAdminNotificationCount(pendingTexturesCount + pendingPacksCount + reportsCount + packReportsCount);
    } catch (error) {
      console.error('Error fetching admin notification count:', error);
    }
  };

  useEffect(() => {
    fetchAdminNotificationCount();
  }, [isAdmin]);

  const handleSignOut = async () => {
    await signOut();
    onNavigate('browse');
  };

  return (
    <>
      <nav className="bg-[#1f293b] shadow-md relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => onNavigate('browse')}
                className="flex items-center text-xl font-bold text-white hover:text-blue-600 transition"
              >
                <img src={SOF} alt="SOF Logo" className="h-10 object-contain mr-2" />
                Textures
              </button>
            </div>

            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => onNavigate('browse')}
                className={`flex items-center px-3 py-2 rounded-md transition ${
                  currentPage === 'browse'
                    ? 'bg-yellow-100 text-yellow-600'
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
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload
                </button>
              )}

              {user && (
                <button
                  onClick={() => onNavigate('create-pack')}
                  className={`flex items-center px-3 py-2 rounded-md transition ${
                    currentPage === 'create-pack'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <Package className="w-5 h-5 mr-2" />
                  Create Pack
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`relative flex items-center px-3 py-2 rounded-md transition ${
                    currentPage === 'admin'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'text-white hover:bg-gray-700'
                  }`}
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Admin
                  {adminNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                    </span>
                  )}
                </button>
              )}

              {user ? (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onViewProfile && profile?.username && onViewProfile(profile.username)}
                    className="text-sm text-white hover:text-yellow-200"
                  >
                    {profile?.username}
                  </button>
                  {profile?.rank === 'admin' && (
                    <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded">
                      Admin
                    </span>
                  )}
                  {profile?.rank === 'trusted' && (
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                      Trusted
                    </span>
                  )}
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
                className="text-white hover:text-gray-300"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#cbd5e1] border-t absolute top-full left-0 right-0 z-10 shadow-lg">
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

              {user && (
                <button
                  onClick={() => {
                    onNavigate('create-pack');
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <Package className="w-5 h-5 mr-2" />
                  Create Pack
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    onNavigate('admin');
                    setMobileMenuOpen(false);
                  }}
                  className="relative flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <Shield className="w-5 h-5 mr-2" />
                  Admin
                  {adminNotificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                    </span>
                  )}
                </button>
              )}

              {user ? (
                <div className="border-t pt-2 mt-2">
                  <button
                    onClick={() => {
                      onViewProfile && profile?.username && onViewProfile(profile.username);
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 underline"
                  >
                    {profile?.username}
                  </button>
                  {(profile?.rank === 'admin' || profile?.rank === 'trusted') && (
                    <div className="px-3 py-1">
                      {profile?.rank === 'admin' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded">
                          Admin
                        </span>
                      )}
                      {profile?.rank === 'trusted' && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded">
                          Trusted
                        </span>
                      )}
                    </div>
                  )}
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
                    className="w-full px-3 py-2 text-black rounded-md"
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
