import { api } from './api.js';

/**
 * Génère le HTML d'un champ "image" : un input file (upload direct) +
 * un input texte cachée `name` qui reçoit l'URL retournée par le backend
 * (donc parfaitement compatible avec une soumission FormData classique).
 */
export function imageUploadFieldHtml({ name, label, currentUrl = '' }) {
  const inputId = `upload-${name}-${Math.random().toString(36).slice(2, 8)}`;
  return `
    <div class="field full">
      <label>${label}</label>
      <input type="hidden" name="${name}" id="${inputId}-value" value="${currentUrl}" />
      <input type="file" accept="image/*" id="${inputId}-file" />
      <div id="${inputId}-preview" style="margin-top:8px;font-size:12px;color:var(--text-muted);">
        ${currentUrl ? `<img src="${currentUrl}" style="max-height:60px;border-radius:6px;" />` : 'Aucune image sélectionnée'}
      </div>
    </div>
  `;
}

/**
 * À appeler juste après avoir injecté le HTML ci-dessus dans le DOM :
 * branche l'upload automatique dès qu'un fichier est choisi.
 */
export function wireImageUploadField(root, name) {
  const fileInputs = root.querySelectorAll(`input[type="file"][id^="upload-${name}-"]`);
  fileInputs.forEach((fileInput) => {
    const prefix = fileInput.id.replace('-file', '');
    const valueInput = root.querySelector(`#${prefix}-value`);
    const preview = root.querySelector(`#${prefix}-preview`);

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      preview.textContent = 'Envoi en cours…';
      try {
        const { url } = await api.uploadImage(file);
        valueInput.value = url;
        preview.innerHTML = `<img src="${url}" style="max-height:60px;border-radius:6px;" />`;
      } catch (e) {
        preview.textContent = `Erreur upload : ${e.message}`;
      }
    });
  });
}
