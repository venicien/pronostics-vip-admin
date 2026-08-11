const axios = require('axios');
const config = require('../config');

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const REQUEST_TIMEOUT_MS = 20000; // évite qu'un appel qui ne répond jamais bloque toute la publication sans erreur ni succès

/**
 * Publie (ou modifie, si un post existe déjà) sur la Page Facebook.
 * - Avec image : publication de type "photo" (meilleure portée organique).
 * - Sans image : publication texte simple dans le fil de la Page.
 *
 * Retourne { postId, postType } à sauvegarder en base pour permettre une
 * future édition en place (même logique que l'édition Telegram, §5.3).
 */
async function postOrEditFacebook({ message, imageUrl, existingPostId, existingPostType }) {
  if (!config.facebook.pageId || !config.facebook.pageAccessToken) {
    throw new Error('Facebook non configuré (FACEBOOK_PAGE_ID / FACEBOOK_PAGE_ACCESS_TOKEN manquants)');
  }

  // ---- Édition d'un post existant ----
  if (existingPostId) {
    try {
      const field = existingPostType === 'photo' ? 'caption' : 'message';
      await axios.post(`${GRAPH_BASE}/${existingPostId}`, null, {
        params: { [field]: message, access_token: config.facebook.pageAccessToken },
        timeout: REQUEST_TIMEOUT_MS,
      });
      return { postId: existingPostId, postType: existingPostType };
    } catch (e) {
      console.warn(`[facebook] Édition impossible (${e.response?.data?.error?.message || e.message}), publication d'un nouveau post.`);
    }
  }

  // ---- Nouvelle publication ----
  // `published: true` est explicite à dessein : selon le statut de revue de
  // l'App Meta, l'API Graph peut sinon créer le post à l'état "brouillon"
  // (visible seulement des admins de la Page) sans renvoyer d'erreur.
  //
  // `timeout` est tout aussi important : sans lui, un appel qui ne répond
  // jamais (réseau, Graph API lente, etc.) bloque la requête indéfiniment —
  // ni succès ni erreur, donc aucun toast côté admin. Avec le timeout, on
  // obtient une vraie erreur après 20s, capturée par le try/catch de la
  // route /publish et affichée dans le toast.
  try {
    if (imageUrl) {
      const { data } = await axios.post(`${GRAPH_BASE}/${config.facebook.pageId}/photos`, null, {
        params: {
          url: imageUrl,
          caption: message,
          published: true,
          access_token: config.facebook.pageAccessToken,
        },
        timeout: REQUEST_TIMEOUT_MS,
      });
      return { postId: data.post_id || data.id, postType: 'photo' };
    }

    const { data } = await axios.post(`${GRAPH_BASE}/${config.facebook.pageId}/feed`, null, {
      params: {
        message,
        link: config.miniAppUrl,
        published: true,
        access_token: config.facebook.pageAccessToken,
      },
      timeout: REQUEST_TIMEOUT_MS,
    });
    return { postId: data.id, postType: 'feed' };
  } catch (e) {
    if (e.code === 'ECONNABORTED') {
      throw new Error(`Facebook n'a pas répondu dans les ${REQUEST_TIMEOUT_MS / 1000}s (timeout)`);
    }
    throw e;
  }
}

module.exports = { postOrEditFacebook };
