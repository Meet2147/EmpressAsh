import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { colors } from '@/theme';
import { siteLink } from '@/config';
import type { Currency, LiveFormat } from '@/data/readings';

/** Opens a page in the in-app browser sheet (Safari on iOS). */
export function openWeb(url: string) {
  return WebBrowser.openBrowserAsync(url, {
    controlsColor: colors.khaki,
    toolbarColor: colors.night,
    dismissButtonStyle: 'close',
  });
}

/**
 * Sends the client to the website checkout for a live reading.
 * The website collects their details, creates a Dodo Payments checkout and
 * takes payment there, so nothing is paid inside the app.
 */
export function openCheckout(readingId: string, format: LiveFormat, currency: Currency) {
  const q = `format=${format}&currency=${currency}`;
  return openWeb(siteLink(`/checkout/${encodeURIComponent(readingId)}?${q}`));
}

export function openExternal(url: string) {
  return Linking.openURL(url);
}
