// src/utils/fetchPageTitle.ts
import { ERROR_MESSAGES } from '@/constants';

// This function fetches the title of a given URL using a CORS proxy.
// It returns a Promise that resolves with the title or an error.
export async function fetchPageTitle(url: string): Promise<string> {
  if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
    return Promise.resolve(''); // Return an empty title for invalid URLs
  }

  try {
    const response = await fetch(`https://api.cors.lol/?url=${encodeURIComponent(url)}`);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    const detectedTitle = doc.querySelector('title')?.textContent;
    return detectedTitle || '';
  } catch (error) {
    console.error("Error fetching title:", error);
    return Promise.reject(new Error(ERROR_MESSAGES.NETWORK_ERROR));
  }
}
