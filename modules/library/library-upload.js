// ============================================================
// Library Upload — Validate, compress, read as DataURL
// ============================================================

const MAX_IMG = 5 * 1024 * 1024, MAX_VID = 50 * 1024 * 1024;
const IMG_TYPES = ['image/jpeg','image/png','image/gif','image/webp'];
const VID_TYPES = ['video/mp4','video/mov','video/webm'];

export async function processFiles(files, onProgress) {
  const results = [];
  for (let i = 0; i < files.length; i++) {
    onProgress?.((i / files.length) * 100);
    try { results.push(await processFile(files[i])); }
    catch (err) { results.push({ error: err.message, name: files[i].name }); }
  }
  onProgress?.(100);
  return results;
}

async function processFile(file) {
  const isImg = IMG_TYPES.includes(file.type), isVid = VID_TYPES.includes(file.type);
  if (!isImg && !isVid) throw new Error(`${file.name}: Định dạng không hỗ trợ`);
  if (isImg && file.size > MAX_IMG) throw new Error(`${file.name}: Ảnh tối đa 5MB`);
  if (isVid && file.size > MAX_VID) throw new Error(`${file.name}: Video tối đa 50MB`);

  const dataUrl = await readDataUrl(file);
  const item = { name: file.name, type: isImg ? 'image' : 'video', mimeType: file.type, size: file.size, dataUrl, tags: [] };

  if (isImg) {
    item.dimensions = await getDimensions(dataUrl);
    if (file.size > 1024 * 1024) item.dataUrl = await compress(dataUrl, 0.85);
  }
  return item;
}

function readDataUrl(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = () => rej(new Error('Đọc file thất bại')); r.readAsDataURL(file); }); }
function getDimensions(url) { return new Promise(res => { const img = new Image(); img.onload = () => res({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = () => res({ width: 0, height: 0 }); img.src = url; }); }

function compress(url, quality) {
  return new Promise(res => {
    const canvas = document.createElement('canvas'), img = new Image();
    img.onload = () => {
      const max = 1920; let { width: w, height: h } = img;
      if (w > max || h > max) { if (w > h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      res(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = url;
  });
}
