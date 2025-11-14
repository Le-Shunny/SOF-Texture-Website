import { useState, useEffect, useLayoutEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import BrowseTextures from './components/BrowseTextures';
import UploadTexture from './components/UploadTexture';
import TextureDetail from './components/TextureDetail';
import EditTexture from './components/EditTexture';
import AdminPanel from './components/AdminPanel';
import ProfileView from './components/ProfileView';
import CreatePack from './components/CreatePack';
import PackDetail from './components/PackDetail';
import { Texture, Pack } from './lib/supabase';

function App() {
  const [currentPage, setCurrentPage] = useState('browse');
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
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

  const handleViewPack = (pack: Pack) => {
    setSelectedPack(pack);
  };

  const handleCloseDetail = () => {
    setSelectedTexture(null);
    setSelectedPack(null);
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

        <Navbar onNavigate={setCurrentPage} currentPage={currentPage} onViewProfile={handleViewProfile} />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {currentPage === 'browse' && (
            <BrowseTextures onViewTexture={handleViewTexture} onEditTexture={handleEditTexture} onViewPack={handleViewPack} onViewProfile={handleViewProfile} />
          )}
          {currentPage === 'upload' && <UploadTexture />}
          {currentPage === 'create-pack' && <CreatePack />}
          {currentPage === 'edit' && editingTexture && <EditTexture texture={editingTexture} onUpdate={handleUpdateTexture} onNavigate={setCurrentPage} />}
          {currentPage === 'admin' && <AdminPanel onViewTexture={handleViewTexture} onViewPack={handleViewPack} />}
          {currentPage === 'profile' && profileUsername && (
            <ProfileView username={profileUsername} onNavigate={setCurrentPage} onViewTexture={handleViewTexture} />
          )}
        </main>

        {selectedTexture && (
          <TextureDetail texture={selectedTexture} onClose={handleCloseDetail} onEdit={handleEditTexture} onViewProfile={handleViewProfile} />
        )}
        {selectedPack && (
          <PackDetail pack={selectedPack} onClose={handleCloseDetail} onViewProfile={handleViewProfile} />
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
