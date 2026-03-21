import { useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';

interface Props {
  image: string | null | undefined;
  onChange: (image: string | null) => void;
}

const ImageUpload = ({ image, onChange }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result as string);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2">
      {image ? (
        <div className="relative group">
          <img
            src={image}
            alt="Scene image"
            className="w-full h-24 object-cover rounded-md ring-1 ring-border"
          />
          <button
            onClick={() => onChange(null)}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
          >
            <X className="w-3.5 h-3.5 text-foreground" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-20 rounded-md border border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all active:scale-[0.98] cursor-pointer"
        >
          <ImagePlus className="w-5 h-5" />
          <span className="text-[10px] font-medium">Add Image</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
};

export default ImageUpload;
