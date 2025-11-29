import { X } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'texture' | 'pack';
}

export default function RulesModal({ isOpen, onClose, type }: RulesModalProps) {
  if (!isOpen) return null;

  const textureRules = [
    "NSFW content including but not limited to slurs, nudity (partial or complete), and gore is strictly prohibited.",
    "No discriminatory content is allowed. While symbols such as the swastika are permitted for historical accuracy, they must be used appropriately.",
    "Ensure proper alignment and avoid errors such as fill lines in your textures.",
    "Stealing other people's textures and claiming them as your own will result in account suspension or permanent ban.",
    "Offensive descriptions or comments are not permitted.",
    "Update your textures during major game updates to ensure compatibility. Otherwise, use the OUTDATED tag"
  ];

  const packRules = [
    "Offensive titles or descriptions are strictly prohibited.",
    "NSFW or any offensive thumbnails are not allowed.",
    "Make sure all textures in the pack comply with the texture uploading rules.",
    "Make sure all textures in the pack are compatible with the latest game version. Otherwise, please point out the outdated texture and its game version, or simply delete it from the pack."
  ];

  const rules = type === 'texture' ? textureRules : packRules;
  const title = type === 'texture' ? 'Texture Uploading Rules' : 'Pack Uploading Rules';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            {rules.map((rule, index) => (
              <li key={index} className="text-sm leading-relaxed">
                {rule}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
