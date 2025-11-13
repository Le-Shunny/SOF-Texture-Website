import { useState, useEffect, useLayoutEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import BrowseTextures from './components/BrowseTextures';
import UploadTexture from './components/UploadTexture';
import TextureDetail from './components/TextureDetail';
import EditTexture from './components/EditTexture';
import AdminPanel from './components/AdminPanel';
import ProfileView from './components/ProfileView';
import { Texture } from './lib/supabase';

function App() {
  const [currentPage, setCurrentPage] = useState('browse');
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [editingTexture, setEditingTexture] = useState<Texture | null>(null);
  const [profileUsername, setProfileUsername] = useState<string>('');

  useLayoutEffect(() => {
    if (currentPage !== 'edit') {
      setEditingTexture(null);
    }
  }, [currentPage]);

  const handleViewTexture = (texture: Texture) => {
    setSelectedTexture(texture);
  };

  const handleCloseDetail = () => {
    setSelectedTexture(null);
  };

  const handleEditTexture = (texture: Texture) => {
    setSelectedTexture(null);
    setEditingTexture(texture);
    setCurrentPage('edit');
  };

  const handleUpdateTexture = (updatedTexture: Texture) => {
    // Update the selectedTexture if it's the same
    if (selectedTexture && selectedTexture.id === updatedTexture.id) {
      setSelectedTexture(updatedTexture);
    }
    setEditingTexture(null);
  };

  const handleCloseEdit = () => {
    setEditingTexture(null);
  };

  const handleViewProfile = (username: string) => {
    setProfileUsername(username);
    setCurrentPage('profile');
  };

  return (
    <AuthProvider>
      <div className={`min-h-screen bg-gray-50 ${selectedTexture || editingTexture ? 'overflow-hidden' : ''}`}>
        <div id="top-ad-placeholder" className="w-full h-0 bg-transparent" />

        <Navbar onNavigate={setCurrentPage} currentPage={currentPage} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentPage === 'browse' && (
            <BrowseTextures onViewTexture={handleViewTexture} onViewProfile={handleViewProfile} />
          )}
          {currentPage === 'upload' && <UploadTexture />}
          {currentPage === 'edit' && editingTexture && <EditTexture texture={editingTexture} onUpdate={handleUpdateTexture} onNavigate={setCurrentPage} />}
          {currentPage === 'admin' && <AdminPanel onViewTexture={handleViewTexture} />}
          {currentPage === 'profile' && profileUsername && (
            <ProfileView username={profileUsername} onNavigate={setCurrentPage} onViewTexture={handleViewTexture} />
          )}
        </main>

        {selectedTexture && (
          <TextureDetail texture={selectedTexture} onClose={handleCloseDetail} onEdit={handleEditTexture} onViewProfile={handleViewProfile} />
        )}

        {editingTexture && currentPage !== 'edit' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <EditTexture texture={editingTexture} onClose={handleCloseEdit} onUpdate={handleUpdateTexture} />
          </div>
        )}

        <div id="bottom-ad-placeholder" className="w-full h-0 bg-transparent" />
      </div>
    </AuthProvider>
  );
}

export default App;
