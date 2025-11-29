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
    "All uploads must comply with Cloudflare's Terms of Service and content policies."
  ];

  const packRules = [
    "Offensive titles or descriptions are strictly prohibited.",
    "NSFW or any offensive thumbnails are not allowed.",
    "All pack content must comply with Cloudflare's Terms of Service and content policies."
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
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
