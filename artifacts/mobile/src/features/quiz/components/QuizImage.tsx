/**
 * QuizImage — shows a question image (anatomy, X-ray, histology, ECG…)
 * with a full-screen pinch-to-zoom viewer on tap.
 *
 * Root causes for "Image unavailable" and how they're handled here:
 *
 *  1. Supabase Storage (private OR public bucket) — expo-image on iOS needs
 *     the `apikey` header for Supabase CDN requests, even for public buckets
 *     when accessed from a native app. We inject `apikey` + `Authorization`
 *     headers automatically for any URL that belongs to the project's Supabase
 *     instance.
 *
 *  2. In __DEV__ mode the exact URI is printed to the console so you can paste
 *     it into a browser and confirm it resolves.
 *
 *  3. Plain HTTPS URLs (not Supabase) are used as-is.
 *
 *  4. HTTP (non-TLS) URLs are blocked by iOS ATS and we surface a clear error.
 */
import { Feather } from "@expo/vector-icons";
import { Image, ImageSource } from "expo-image";
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { supabase } from "@/src/shared/services/supabase";
import { useColors, type ThemeColors } from "@/src/shared/hooks/useColors";
import { useWindowDimensions } from "react-native";

const SUPABASE_URL = (process.env["EXPO_PUBLIC_SUPABASE_URL"] ?? "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] ?? "";

/** Returns true if the URL looks like a direct image file rather than a webpage. */
function looksLikeImageUrl(uri: string): boolean {
  try {
    const url = new URL(uri);
    const path = url.pathname.toLowerCase();
    // Explicit image extensions
    if (/\.(jpe?g|png|webp|gif|svg|avif|heic|bmp|tiff?)(\?|$)/.test(path)) return true;
    // Supabase Storage paths don't end with image extensions but ARE images
    if (path.includes("/storage/v1/")) return true;
    // Anything ending in .html / .htm / .php / .asp is definitely not an image
    if (/\.(html?|php|asp|aspx|jsp|cgi|htm)(\?|$)/.test(path)) return false;
    // No extension — could be an image CDN URL, give it the benefit of the doubt
    return true;
  } catch {
    return false;
  }
}

/** Resolves the correct ImageSource for expo-image, injecting auth headers
 *  when the URL belongs to this project's Supabase instance. */
async function resolveSource(uri: string): Promise<ImageSource> {
  // ── Supabase Storage URL ─────────────────────────────────────────────────
  if (SUPABASE_URL && uri.startsWith(SUPABASE_URL) && uri.includes("/storage/v1/")) {
    const headers: Record<string, string> = { apikey: SUPABASE_ANON_KEY };

    // Add the user's JWT so private-bucket URLs also work
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers["Authorization"] = `Bearer ${data.session.access_token}`;
    }

    if (__DEV__) {
      console.warn("[QuizImage] Supabase Storage URL →", uri);
    }

    return { uri, headers };
  }

  // ── Generic HTTPS URL ────────────────────────────────────────────────────
  if (__DEV__) {
    console.warn("[QuizImage] External URL →", uri);
  }

  return { uri };
}

interface Props {
  uri: string;
  caption?: string;
}

function QuizImageComponent({ uri, caption }: Props) {
  const [source, setSource] = useState<ImageSource | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  
  const colors = useColors();
  const { width, height } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, width, height), [colors, width, height]);

  // Resolve auth headers (async) before rendering the image
  useEffect(() => {
    if (!uri) return;
    setError(false);
    setLoaded(false);
    setSource(null);

    // Catch URLs that are webpages, not images (e.g. .html links stored by mistake)
    if (!looksLikeImageUrl(uri)) {
      if (__DEV__) {
        console.warn(
          "[QuizImage] URL does not look like an image file — " +
          "store a direct .jpg/.png/.webp URL or a Supabase Storage URL.\n" +
          "Got:", uri
        );
      }
      setError(true);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    resolveSource(uri).then(s => {
      if (!cancelled) setSource(s);
    }).catch(() => {
      if (!cancelled) setSource({ uri });
    });

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (!uri) return null;

  return (
    <>
      {/* ── Thumbnail ────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.thumbWrap}
        onPress={() => !error && source && setOpen(true)}
        activeOpacity={0.88}
      >
        {/* Skeleton shown while source is being resolved / image loading */}
        {(!source || !loaded) && !error && (
          <Animated.View
            entering={FadeIn.duration(180)}
            exiting={FadeOut.duration(180)}
            style={styles.skeleton}
          >
            <Feather name="image" size={28} color={colors.mutedForeground} />
          </Animated.View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="image" size={28} color={colors.mutedForeground} />
            <Text style={styles.errorText}>Image unavailable</Text>
            {__DEV__ && (
              <Text style={styles.errorUri} numberOfLines={3}>{uri}</Text>
            )}
          </View>
        ) : source ? (
          <Image
            source={source}
            style={[styles.thumb, { opacity: loaded ? 1 : 0 }]}
            contentFit="contain"
            transition={250}
            onLoad={() => setLoaded(true)}
            onError={(e) => {
              if (__DEV__) console.warn("[QuizImage] Load error:", e, "URI:", uri);
              setError(true);
              setLoaded(true);
            }}
          />
        ) : null}

        {/* Expand badge */}
        {loaded && !error && (
          <View style={styles.expandBadge}>
            <Feather name="maximize-2" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>

      {caption ? <Text style={styles.caption}>{caption}</Text> : null}

      {/* ── Full-screen viewer ────────────────────────────────────────────── */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.modalBg}>
          <StatusBar hidden />

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => {
              scrollRef.current?.scrollTo({ x: 0, y: 0, animated: false });
              setOpen(false);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Pinch-to-zoom — native scroll zoom on iOS, pan on Android */}
          <ScrollView
            ref={scrollRef}
            style={styles.zoomScroll}
            contentContainerStyle={styles.zoomContent}
            maximumZoomScale={6}
            minimumZoomScale={1}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            bouncesZoom
            centerContent
          >
            {source && (
              <Image
                source={source}
                style={styles.fullImg}
                contentFit="contain"
                transition={150}
              />
            )}
          </ScrollView>

          <View style={styles.hint}>
            <Feather name="zoom-in" size={12} color="rgba(255,255,255,0.5)" />
            <Text style={styles.hintText}>Pinch to zoom</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: ThemeColors, SCREEN_W: number, SCREEN_H: number) => StyleSheet.create({
  thumbWrap: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.muted,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  skeleton: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: { width: "100%", height: "100%" },
  expandBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    padding: 6,
  },
  errorBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.mutedForeground,
    fontFamily: "Inter_400Regular",
  },
  errorUri: {
    fontSize: 10,
    color: colors.mutedForeground,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 4,
  },
  caption: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.mutedForeground,
    textAlign: "center",
    marginBottom: 2,
    lineHeight: 17,
  },

  // ── Full-screen modal ───────────────────────────────────────────────────
  // Note: Modal styles keep hardcoded #fff/black because they overlay the entire screen
  // in a standard image-viewer presentation, regardless of app theme.
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "android" ? 44 : 56,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 10,
  },
  zoomScroll: { width: SCREEN_W, height: SCREEN_H },
  zoomContent: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: "center",
    justifyContent: "center",
  },
  fullImg: {
    width: SCREEN_W,
    height: SCREEN_H * 0.82,
  },
  hint: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hintText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
  },
});

export const QuizImage = React.memo(QuizImageComponent);
