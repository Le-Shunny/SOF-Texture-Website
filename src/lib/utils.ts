export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'm';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'k';
  } else {
    return num.toString();
  }
}

function isImage(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)$/i.test(url);
}

function isYouTube(url: string): boolean {
  return /youtube\.com\/watch\?v=|youtu\.be\//.test(url);
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
}

export function processText(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    if (isImage(url)) {
      return `<img src="${url}" alt="" style="max-width: 100%; height: auto;" />`;
    } else if (isVideo(url)) {
      return `<video controls style="max-width: 100%;"><source src="${url}" /></video>`;
    } else if (isYouTube(url)) {
      const id = extractYouTubeId(url);
      if (id) {
        return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
      }
    }
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}