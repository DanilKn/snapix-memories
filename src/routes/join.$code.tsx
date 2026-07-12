import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  setDoc,
  serverTimestamp,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import {
  signInAnonymously,
} from "firebase/auth";
import { db, auth, storage } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Frame, ApertureLogo, BrandMark } from "@/components/snapix/Frame";
import sunset from "@/assets/film-sunset.jpg";
import { QRCodeSVG } from "qrcode.react";

const resolveImageUrl = (path?: string) => {
  if (!path) return sunset;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("data:")) return path;
  const cleanPath = path.replace(/^\/+/, "");
  return "/" + cleanPath;
};

export const Route = createFileRoute("/join/$code")({
  head: () => ({ meta: [{ title: "Join Event — Snapix" }] }),
  component: JoinByCode,
});

/* ────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────── */
interface EventData {
  id: string;
  name: string;
  code: string;
  creatorId: string;
  coverImageUrl?: string;
  startsAt: Timestamp | null;
  endsAt: Timestamp | null;
  revealMode: string;
  lens: string;
  participants: string[];
  maxParticipants: number;
  shotsLimit: number;
  status: string;
  hostName: string;
}

interface PhotoData {
  id: string;
  publicUrl: string;
  uploaderName: string;
  createdAt: Timestamp | null;
}

/* ────────────────────────────────────────────────────────────
   Main Component
   ──────────────────────────────────────────────────────────── */
function JoinByCode() {
  const { code } = Route.useParams();
  const { user, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flow state: "invite" | "name" | "gallery"
  const [step, setStep] = useState<"invite" | "name" | "gallery">("invite");
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);

  // Info Modal & Participants Modal
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantNames, setParticipantNames] = useState<string[]>([]);

  // Photo viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Countdown / Time left strings (in RU or EN)
  const [timeLeft, setTimeLeft] = useState("");
  const [isDeveloped, setIsDeveloped] = useState(false);

  // Camera & QR bottom sheet state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [selectFramesOpen, setSelectFramesOpen] = useState(false);

  // Check if browser is in Russian language
  const isRu = typeof navigator !== "undefined" && navigator.language.startsWith("ru");
  const tr = (ru: string, en: string) => (isRu ? ru : en);

  // ── 1. Load event data ───────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const loadEvent = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }
        if (cancelled) return;

        let eventDocId: string | null = null;

        // Try by invite code first
        const upperCode = code.trim().toUpperCase();
        const q = query(
          collection(db, "events"),
          where("code", "==", upperCode)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          eventDocId = snap.docs[0].id;
        } else {
          // Fallback: try as document ID
          const directDoc = await getDoc(doc(db, "events", code.trim()));
          if (directDoc.exists()) {
            eventDocId = directDoc.id;
          }
        }

        if (!eventDocId) {
          if (!cancelled) {
            setError(
              tr(
                "Мероприятие не найдено. Пожалуйста, проверьте ссылку.",
                "Event not found. Please check your invite link."
              )
            );
            setLoading(false);
          }
          return;
        }

        // Subscribe to event document
        const unsub = onSnapshot(doc(db, "events", eventDocId), async (docSnap) => {
          if (cancelled) return;
          if (!docSnap.exists()) {
            setError(tr("Мероприятие больше не существует.", "Event no longer exists."));
            setLoading(false);
            return;
          }
          const d = docSnap.data();

          // Fetch creator name
          let hostName = tr("Организатор", "Organizer");
          const creatorId = d.creatorId || "";
          if (creatorId) {
            try {
              const userSnap = await getDoc(doc(db, "users", creatorId));
              if (userSnap.exists()) {
                hostName = userSnap.data().displayName || tr("Организатор", "Organizer");
              }
            } catch (e) {
              console.error("Error resolving creator name:", e);
            }
          }

          const eventData: EventData = {
            id: docSnap.id,
            name: d.name || tr("Без названия", "Untitled Event"),
            code: d.code || "",
            creatorId: d.creatorId || "",
            coverImageUrl: d.coverImageUrl,
            startsAt: d.startsAt || null,
            endsAt: d.endsAt || null,
            revealMode: d.revealMode || "after",
            lens: d.lens || "Original 35mm",
            participants: d.participants || [],
            maxParticipants: d.maxParticipants || 10,
            shotsLimit: d.shotsLimit || 24,
            status: d.status || "active",
            hostName: hostName,
          };
          setEvent(eventData);

          // Check developed state
          const endsAt = eventData.endsAt?.toDate();
          const dev =
            eventData.revealMode === "during" ||
            (endsAt ? new Date() > endsAt : false);
          setIsDeveloped(dev);
          setLoading(false);

          // Fetch participants names
          const pIds = d.participants || [];
          const namesList: string[] = [];
          for (const uid of pIds) {
            try {
              const uSnap = await getDoc(doc(db, "users", uid));
              if (uSnap.exists()) {
                namesList.push(uSnap.data().displayName || tr("Гость", "Guest"));
              }
            } catch (e) {
              console.error(e);
            }
          }
          setParticipantNames(namesList);
        });

        // Subscribe to photos collection
        const photosQuery = query(
          collection(db, "photos"),
          where("eventId", "==", eventDocId)
        );
        const unsubPhotos = onSnapshot(photosQuery, (snapshot) => {
          if (cancelled) return;
          const list: PhotoData[] = [];
          snapshot.forEach((pDoc) => {
            const pData = pDoc.data();
            list.push({
              id: pDoc.id,
              publicUrl: pData.publicUrl,
              uploaderName: pData.uploaderName || tr("Гость", "Guest"),
              createdAt: pData.createdAt || null,
            });
          });
          // Sort client-side by createdAt descending
          list.sort((a, b) => {
            const timeA = a.createdAt?.toDate().getTime() || 0;
            const timeB = b.createdAt?.toDate().getTime() || 0;
            return timeB - timeA;
          });
          setPhotos(list);
        });

        return () => {
          unsub();
          unsubPhotos();
        };
      } catch (err) {
        console.error("Error loading event:", err);
        if (!cancelled) {
          setError(tr("Не удалось загрузить событие.", "Failed to load event."));
          setLoading(false);
        }
      }
    };

    loadEvent();
    return () => {
      cancelled = true;
    };
  }, [code, isRu, authLoading]);

  // ── 2. Determine flow step based on auth + participation ──
  useEffect(() => {
    if (authLoading || loading) return;
    if (user && event && event.participants.includes(user.uid)) {
      setStep("gallery");
    } else {
      setStep("invite");
    }
  }, [user, authLoading, event, loading]);

  // ── 3. Countdown timer ──────────────────────────────────
  useEffect(() => {
    if (!event || isDeveloped) return;
    const updateTime = () => {
      const endsAt = event.endsAt?.toDate();
      if (!endsAt) return;
      const diff = endsAt.getTime() - Date.now();
      if (diff <= 0) {
        setIsDeveloped(true);
        setTimeLeft("");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(tr(`${days} д. ${hours} ч.`, `${days}d ${hours}h`));
      } else if (hours > 0) {
        setTimeLeft(tr(`${hours}ч ${minutes}м`, `${hours}h ${minutes}m`));
      } else {
        setTimeLeft(tr(`${minutes} мин.`, `${minutes}m`));
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 10000); // update every 10s is enough
    return () => clearInterval(timer);
  }, [event, isDeveloped, isRu]);

  // ── Join handler ────────────────────────────────────────
  const handleJoin = useCallback(async () => {
    if (!event || !name.trim()) return;
    setJoining(true);
    try {
      // 1. Firebase Auth anonymously if not signed in
      let currentUserId = user?.uid;
      if (!currentUserId) {
        const cred = await signInAnonymously(auth);
        currentUserId = cred.user.uid;
      }

      // 2. Save user profile
      await setDoc(
        doc(db, "users", currentUserId),
        {
          displayName: name.trim(),
          avatarUrl: "",
          isAnonymous: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 3. Add to participants
      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, {
        participants: arrayUnion(currentUserId),
      });

      // 4. Move to step 3 (Gallery)
      setStep("gallery");
    } catch (err) {
      console.error("Join error:", err);
    } finally {
      setJoining(false);
    }
  }, [user, event, name]);

  // ── Download photo ──────────────────────────────────────
  const downloadPhoto = useCallback(async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Download error, falling back to direct anchor link:", err);
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  // ── Loading state ───────────────────────────────────────
  if (loading || authLoading) {
    return (
      <Frame>
        <div className="flex flex-col min-h-screen items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-t-transparent border-white/60" />
          <p className="mt-5 text-[13px] text-white/40 tracking-wide">
            {tr("Загрузка...", "Loading event...")}
          </p>
        </div>
      </Frame>
    );
  }

  // ── Error state ─────────────────────────────────────────
  if (error || !event) {
    return (
      <Frame>
        <div className="flex flex-col min-h-screen items-center justify-center p-8 text-center">
          <ApertureLogo size={48} className="text-white/20" />
          <h1 className="mt-6 font-display italic text-[26px] leading-tight">
            {tr("Мероприятие не найдено", "Event not found")}
          </h1>
          <p className="mt-3 text-[14px] text-white/45 max-w-[260px]">
            {error || tr("Убедитесь, что ссылка верна.", "Make sure you have the correct invite link.")}
          </p>
        </div>
      </Frame>
    );
  }

  const coverUrl = resolveImageUrl(event.coverImageUrl);
  const hasEnded = event.endsAt
    ? new Date() > event.endsAt.toDate()
    : false;
  const shotsStr = event.shotsLimit >= 999 ? "∞" : `${event.shotsLimit}`;

  // ═══════════════════════════════════════════════════════════
  // STEP 1: INVITE (Screenshot 1) — Open in App or Browser
  // ═══════════════════════════════════════════════════════════
  if (step === "invite") {
    return (
      <Frame>
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Soft dark gradient from middle to bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.85) 75%, rgb(0,0,0) 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col min-h-screen px-6 pb-12 pt-8 text-center justify-between">
          <div />

          {/* Center Content */}
          <div className="flex flex-col items-center">
            {/* Event Title — Playfair Display */}
            <h1
              className="text-white text-[38px] leading-tight font-medium"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                letterSpacing: "-0.5px",
              }}
            >
              {event.name}
            </h1>

            {/* Invited by Host */}
            <div className="flex items-center gap-1.5 mt-3 text-white/60 text-[14px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span>{tr(`Пригласил(а) ${event.hostName}`, `Invited by ${event.hostName}`)}</span>
            </div>

            {/* Ended / Shots available info row */}
            <div className="flex items-center gap-4 mt-3 text-white/50 text-[13px]">
              <div className="flex items-center gap-1">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="opacity-70"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{hasEnded ? tr("Завершено", "Ended") : tr(`Осталось ${timeLeft}`, `${timeLeft} left`)}</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="flex items-center gap-1">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="opacity-70"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>{shotsStr} {tr("кадров", "shots")}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col items-center">
            {/* Open in App (Pill white) */}
            <button
              onClick={() => {
                window.location.href = `snapix://join/${code}`;
              }}
              className="w-full h-14 bg-white text-black font-semibold rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition text-[15px]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              {tr("Открыть в приложении", "Open in App")}
            </button>

            {/* Join in Browser (Pill dark) */}
            <button
              onClick={() => setStep("name")}
              className="w-full h-14 bg-[#1C1C1E]/80 border border-white/5 text-white font-semibold rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition mt-3 text-[15px]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              {tr("Войти в браузере", "Join in Browser")}
            </button>

            {/* Don't have the app? Download here. */}
            <a
              href="https://apps.apple.com/app/snapix"
              target="_blank"
              rel="noreferrer"
              className="text-center text-[13px] text-white/50 underline underline-offset-2 mt-6 block"
            >
              {tr("Нет приложения? Скачайте здесь.", "Don't have the app? Download here.")}
            </a>
          </div>
        </div>
      </Frame>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 2: NAME INPUT (Screenshot 2) — Enter name to join
  // ═══════════════════════════════════════════════════════════
  if (step === "name") {
    return (
      <Frame>
        <img
          src={coverUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Soft dark gradient from middle to bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.85) 75%, rgb(0,0,0) 100%)",
          }}
        />

        <div className="relative z-10 flex flex-col min-h-screen px-6 pb-12 pt-8 justify-between">
          {/* Top Pill Header */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white" className="opacity-70">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
              <span className="text-[12px] text-white/80 font-medium">
                {tr(`Пригласил(а) ${event.hostName}`, `Invited by ${event.hostName}`)}
              </span>
            </div>
          </div>

          {/* Center Details */}
          <div className="text-center mt-auto mb-10">
            {/* Event Title */}
            <h1
              className="text-white text-[38px] leading-tight font-medium"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                letterSpacing: "-0.5px",
              }}
            >
              {event.name}
            </h1>

            {/* Time & Shots available info row */}
            <div className="flex items-center justify-center gap-2 mt-3 text-white/50 text-[13px]">
              <div className="flex items-center gap-1">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="opacity-70"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>{hasEnded ? tr("Завершено", "Ended") : tr(`Осталось ${timeLeft}`, `${timeLeft} left`)}</span>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              <div className="flex items-center gap-1">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="opacity-70"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>{shotsStr} {tr("кадров доступно", "shots available")}</span>
              </div>
            </div>
          </div>

          {/* Input & Take camera button */}
          <div className="w-full">
            {/* Name Input field */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={tr("Введите имя", "Enter your name")}
                id="name-input"
                className="w-full h-14 pl-11 pr-4 rounded-2xl bg-[#1C1C1E]/80 border border-white/5 text-white text-[15px] placeholder:text-white/30 outline-none focus:border-white/20 transition"
              />
            </div>

            {/* "Take your camera ->" button */}
            <button
              onClick={handleJoin}
              disabled={joining || !name.trim()}
              id="join-button"
              className={`w-full h-14 mt-3 rounded-full font-bold text-[15px] flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                name.trim()
                  ? "bg-white text-black"
                  : "bg-[#8E8E93]/60 text-white/40 cursor-not-allowed"
              }`}
            >
              {joining ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <>
                  {tr("Взять камеру", "Take your camera")}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </Frame>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 3: GALLERY (Event view) — Matching Simulator Layout
  // ═══════════════════════════════════════════════════════════
  return (
    <Frame>
      {/* Full-bleed background */}
      <img
        src={coverUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Multi-stop gradient like Flutter */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.9) 75%, rgb(0,0,0) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen overflow-y-auto pb-10">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-5">
          <div className="h-10" />
        </div>

        <div className="h-8" />

        {/* Event Title — Georgia/Playfair display */}
        <h1
          className="text-center text-white px-6 font-normal"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "38px",
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
          }}
        >
          {event.name}
        </h1>

        <div className="h-7" />

        {/* Stats Row — Moments | Time Left | People */}
        <div className="flex items-center justify-evenly px-8">
          <StatColumn
            value={`${photos.length}`}
            label={tr("Кадров", "Moments")}
          />
          <div className="w-px h-9 bg-white/20" />
          <StatColumn
            value={
              hasEnded
                ? formatShortDate(event.endsAt?.toDate(), isRu)
                : timeLeft || "..."
            }
            label={hasEnded ? tr("Завершено", "Ended") : tr("Осталось", "Left")}
            italic
          />
          <div className="w-px h-9 bg-white/20" />
          <button
            onClick={() => setShowParticipantsModal(true)}
            className="flex flex-col items-center bg-transparent border-none outline-none cursor-pointer"
          >
            <StatColumn
              value={`${event.participants.length}`}
              label={tr("Участников ›", "People ›")}
            />
          </button>
        </div>

        <div className="h-7" />

        {/* Action buttons */}
        <div className="px-5">
          {hasEnded ? (
            <div className="flex gap-2.5">
              <ActionButton
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                }
                label={tr("Отправить", "Send")}
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: event.name,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    setInfoModal({
                      title: tr("Ссылка скопирована", "Link Copied"),
                      body: tr(
                        "Ссылка-приглашение скопирована в буфер обмена.",
                        "Invite link copied to clipboard. Share it with friends!"
                      ),
                    });
                  }
                }}
              />
              <ActionButton
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                }
                label={tr("Сохранить", "Save")}
                onClick={() => setSelectFramesOpen(true)}
              />
            </div>
          ) : (
            <div className="flex gap-2.5">
              {/* Camera button */}
              <button
                onClick={() => {
                  const myPhotos = photos.filter((p) => p.uploaderName === name);
                  const shotsLeft = Math.max(0, event.shotsLimit - myPhotos.length);
                  if (shotsLeft <= 0) {
                    setInfoModal({
                      title: tr("Нет кадров", "No frames left"),
                      body: tr(
                        "Вы использовали все доступные кадры для этого фильма.",
                        "You have used all available frames for this film."
                      ),
                    });
                  } else {
                    setCameraOpen(true);
                  }
                }}
                className="flex-1 h-[58px] rounded-full bg-white flex items-center justify-center transition active:scale-[0.98]"
              >
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="text-black"
                >
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                </svg>
              </button>
              {/* QR / Share */}
              <GlassSquareButton
                onClick={() => setQrOpen(true)}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="3" height="3" />
                  <rect x="20" y="14" width="1" height="3" />
                  <rect x="14" y="20" width="3" height="1" />
                  <rect x="20" y="20" width="1" height="1" />
                </svg>
              </GlassSquareButton>
              {/* Download */}
              <GlassSquareButton
                onClick={() => {
                  if (isDeveloped && photos.length > 0) {
                    downloadAllPhotos(photos);
                  } else {
                    setInfoModal({
                      title: tr("Фотографии проявляются...", "Photos are developing..."),
                      body: tr(
                        `Фотографии откроются через ${timeLeft || "некоторое время"}.`,
                        `Photos will reveal in ${timeLeft || "a few moments"}.`
                      ),
                    });
                  }
                }}
                opacity={isDeveloped ? 1 : 0.48}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </GlassSquareButton>
            </div>
          )}
        </div>

        <div className="h-7" />

        {/* Moments grid — matching Simulator 2-column layout */}
        {photos.length === 0 ? (
          <div className="mx-6 rounded-[20px] bg-white/5 border border-white/5 p-6 flex flex-col items-center text-center">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-white/40"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="mt-3 text-[16px] font-semibold text-white/80">
              {tr("Нет кадров", "No moments yet")}
            </p>
            <p className="mt-1 text-[13px] text-white/40">
              {tr("Будьте первыми, кто сделает кадр!", "Be the first to capture a memory!")}
            </p>
          </div>
        ) : (
          <div className="px-5 grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <MomentCard
                key={photo.id}
                photo={photo}
                isDeveloped={isDeveloped}
                countdownText={tr(`Раскроется через ${timeLeft}`, `Reveals in ${timeLeft}`)}
                lens={event.lens}
                onClick={() => {
                  if (isDeveloped) {
                    setViewerIndex(index);
                    setViewerOpen(true);
                  } else {
                    setInfoModal({
                      title: tr("Фотографии проявляются...", "Photos are developing..."),
                      body: tr(
                        `Фотографии откроются через ${timeLeft || "некоторое время"}.`,
                        `Photos will reveal in ${timeLeft || "a few moments"}.`
                      ),
                    });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Photo Viewer Overlay */}
      {viewerOpen && isDeveloped && photos.length > 0 && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          onClose={() => setViewerOpen(false)}
          onDownload={downloadPhoto}
          tr={tr}
          lens={event.lens}
        />
      )}

      {/* Cupertino-style Modal Popup Overlay */}
      {infoModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-[280px] rounded-2xl bg-[#1C1C1E] border border-white/10 text-center shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5">
              <h3 className="text-white font-semibold text-[17px] leading-tight">
                {infoModal.title}
              </h3>
              <p className="mt-2 text-[13px] text-white/70 leading-normal">
                {infoModal.body}
              </p>
            </div>
            <div className="border-t border-white/10">
              <button
                onClick={() => setInfoModal(null)}
                className="w-full h-11 bg-transparent text-[#0A84FF] font-medium text-[16px] transition active:bg-white/5 outline-none border-none"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants List Modal */}
      {showParticipantsModal && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-[300px] rounded-2xl bg-[#1C1C1E] border border-white/10 shadow-2xl overflow-hidden max-h-[80%] flex flex-col">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold text-[16px]">
                {tr("Участники", "Participants")}
              </h3>
              <span className="text-[12px] bg-white/10 px-2 py-0.5 rounded-full text-white/80">
                {participantNames.length}
              </span>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {participantNames.length === 0 ? (
                <p className="text-[13px] text-white/40 text-center">
                  {tr("Нет участников", "No participants yet")}
                </p>
              ) : (
                participantNames.map((pName, i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-[13px] font-bold text-white uppercase">
                      {pName.charAt(0)}
                    </div>
                    <span className="text-[14px] text-white/90 font-medium">
                      {pName}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-white/10">
              <button
                onClick={() => setShowParticipantsModal(false)}
                className="w-full h-11 bg-transparent text-[#0A84FF] font-medium text-[15px] active:bg-white/5 outline-none border-none"
              >
                {tr("Закрыть", "Close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web Camera Overlay */}
      {cameraOpen && event && (
        <WebCameraOverlay
          event={event}
          userName={name}
          userUid={user?.uid || "anonymous"}
          onClose={() => setCameraOpen(false)}
          shotsLeft={Math.max(0, event.shotsLimit - photos.filter((p) => p.uploaderName === name).length)}
          lastPhotoUrl={photos.length > 0 ? photos[0].publicUrl : null}
          tr={tr}
          isRu={isRu}
          timeLeft={timeLeft}
          onPhotoUploaded={(newPhoto) => {
            setPhotos((prev) => [newPhoto, ...prev]);
          }}
          onOpenQr={() => setQrOpen(true)}
        />
      )}

      {/* QR Bottom Sheet */}
      {qrOpen && event && (
        <InviteBottomSheet
          event={event}
          onClose={() => setQrOpen(false)}
          tr={tr}
        />
      )}

      {/* Select Frames Bottom Sheet */}
      {selectFramesOpen && event && (
        <SelectFramesBottomSheet
          event={event}
          photos={photos}
          onClose={() => setSelectFramesOpen(false)}
          tr={tr}
          isRu={isRu}
          downloadPhoto={downloadPhoto}
        />
      )}

      {/* SVG Color Filters for LensFilter */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
        <filter id="black-and-white-filter">
          <feColorMatrix type="matrix" values="
            0.28 0.84 0.10 0 -0.0588
            0.28 0.84 0.10 0 -0.0588
            0.28 0.84 0.10 0 -0.0588
            0    0    0    1 0" />
        </filter>
        <filter id="vintage-filter">
          <feColorMatrix type="matrix" values="
            1.15 0    0    0 -0.0313
            0    1.10 0    0 -0.0313
            -0.06 -0.06 0.90 0 0.0706
            0    0    0    1 0" />
        </filter>
      </svg>
    </Frame>
  );

  /* ── Download all ─────────────────────────────────────── */
  function downloadAllPhotos(photos: PhotoData[]) {
    if (!isDeveloped || photos.length === 0) return;
    photos.forEach((p, i) => {
      setTimeout(() => {
        downloadPhoto(
          p.publicUrl,
          `snapix_${event!.name.replace(/\s+/g, "_")}_${i + 1}.jpg`
        );
      }, i * 500);
    });
  }
}

/* ════════════════════════════════════════════════════════════
   Sub-Components
   ════════════════════════════════════════════════════════════ */

function StatColumn({
  value,
  label,
  italic,
}: {
  value: string;
  label: string;
  italic?: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-white"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "22px",
          fontWeight: 400,
          fontStyle: italic ? "italic" : "normal",
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span className="mt-1.5 text-[12.5px] text-white/75">{label}</span>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 h-[58px] rounded-full bg-white/12 flex items-center justify-center gap-2 text-white text-[16px] font-semibold transition active:scale-[0.98] hover:bg-white/18"
    >
      {icon}
      {label}
    </button>
  );
}

function GlassSquareButton({
  children,
  onClick,
  opacity = 1,
}: {
  children: React.ReactNode;
  onClick: () => void;
  opacity?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{ opacity }}
      className="w-[58px] h-[58px] rounded-[17px] bg-white/[0.18] backdrop-blur-xl flex items-center justify-center text-white transition active:scale-[0.96] hover:bg-white/25"
    >
      {children}
    </button>
  );
}

function LensFilter({ children, lens }: { children: React.ReactNode; lens: string }) {
  if (lens === "Black & White" || lens === "Black and White") {
    return (
      <div className="relative w-full h-full overflow-hidden select-none">
        {/* Grayscale filter matching Flutter color matrix */}
        <div className="w-full h-full" style={{ filter: "url(#black-and-white-filter)" }}>
          {children}
        </div>
        
        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 47% 47%, rgba(255, 255, 255, 0.15) 0%, transparent 35%, transparent 65%, rgba(0, 0, 0, 0.75) 100%)",
          }}
        />
        
        {/* Analog film grain texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.10] bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/images/film-grain.jpg')" }}
        />
      </div>
    );
  }

  if (lens === "Vintage") {
    return (
      <div className="relative w-full h-full overflow-hidden select-none">
        {/* Vintage filter matching Flutter color matrix */}
        <div className="w-full h-full" style={{ filter: "url(#vintage-filter)" }}>
          {children}
        </div>
        
        {/* Vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 47% 47%, rgba(255, 247, 234, 0.15) 0%, transparent 35%, transparent 65%, rgba(3, 5, 8, 0.70) 100%)",
          }}
        />
        
        {/* Analog film grain texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08] bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/images/film-grain.jpg')" }}
        />
      </div>
    );
  }

  return <>{children}</>;
}

function MomentCard({
  photo,
  isDeveloped,
  countdownText,
  onClick,
  lens,
}: {
  photo: PhotoData;
  isDeveloped: boolean;
  countdownText: string;
  onClick: () => void;
  lens: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-[20px] overflow-hidden bg-white/5 w-full text-left"
      style={{ aspectRatio: "3 / 4.5" }}
    >
      <div className="absolute inset-0">
        <LensFilter lens={lens}>
          <img
            src={resolveImageUrl(photo.publicUrl)}
            alt={`by ${photo.uploaderName}`}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover ${
              !isDeveloped ? "blur-[18px] scale-110" : ""
            }`}
          />
        </LensFilter>
      </div>

      {/* Dark gradient overlay on blurred/clear cards */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {!isDeveloped && (
        <>
          {/* Countdown pill */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="px-2.5 py-1.5 rounded-full bg-black/44 text-[10px] font-medium text-white text-center">
              {countdownText}
            </span>
          </div>
        </>
      )}

      {/* Author name is always visible at the bottom left (Georgia italic style) */}
      <span
        className="absolute left-3.5 bottom-3.5 text-white"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontSize: "17px",
          fontWeight: 500,
        }}
      >
        {photo.uploaderName}
      </span>
    </button>
  );
}

/* ── Photo Viewer ────────────────────────────────────────── */
function PhotoViewer({
  photos,
  initialIndex,
  onClose,
  onDownload,
  tr,
  lens,
}: {
  photos: PhotoData[];
  initialIndex: number;
  onClose: () => void;
  onDownload: (url: string, filename: string) => void;
  tr: (ru: string, en: string) => string;
  lens: string;
}) {
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-[13px] text-white/60">
            {index + 1} / {photos.length}
          </p>
        </div>
        <button
          onClick={() =>
            onDownload(photo.publicUrl, `snapix_${index + 1}.jpg`)
          }
          className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>

      {/* Photo */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-h-full max-w-full rounded-2xl overflow-hidden relative" style={{ aspectRatio: "3 / 4.5", height: "80%" }}>
          <LensFilter lens={lens}>
            <img
              src={resolveImageUrl(photo.publicUrl)}
              alt={`by ${photo.uploaderName}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </LensFilter>
        </div>
      </div>

      {/* Bottom info + nav */}
      <div className="px-6 pb-8">
        <p
          className="text-white text-center"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic",
            fontSize: "18px",
          }}
        >
          by {photo.uploaderName}
        </p>
        {photo.createdAt && (
          <p className="mt-1 text-center text-[12px] text-white/40">
            {photo.createdAt.toDate().toLocaleDateString(tr("ru-RU", "en-US"), {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}

        {/* Navigation arrows */}
        {photos.length > 1 && (
          <div className="flex justify-center gap-4 mt-4">
            <button
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
              className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30 transition"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              onClick={() =>
                setIndex((i) => Math.min(photos.length - 1, i + 1))
              }
              disabled={index === photos.length - 1}
              className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center text-white disabled:opacity-30 transition"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function WebCameraOverlay({
  event,
  userName,
  userUid,
  onClose,
  shotsLeft,
  lastPhotoUrl,
  tr,
  isRu,
  timeLeft,
  onPhotoUploaded,
  onOpenQr,
}: {
  event: EventData;
  userName: string;
  userUid: string;
  onClose: () => void;
  shotsLeft: number;
  lastPhotoUrl: string | null;
  tr: (ru: string, en: string) => string;
  isRu: boolean;
  timeLeft: string;
  onPhotoUploaded: (newPhoto: PhotoData) => void;
  onOpenQr: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [flashMode, setFlashMode] = useState<"off" | "on">("off");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showFlashOverlay, setShowFlashOverlay] = useState(false);

  // Ultra-wide multi-lens states
  const [hasUltraWide, setHasUltraWide] = useState(false);
  const [ultraWideDeviceId, setUltraWideDeviceId] = useState<string | null>(null);
  const [normalBackDeviceId, setNormalBackDeviceId] = useState<string | null>(null);

  const touchStartDistRef = useRef<number | null>(null);
  const baseZoomRef = useRef<number>(1.0);

  const isUltraWide = (label: string) => {
    const l = label.toLowerCase();
    return l.includes('ultra') || l.includes('сверхшироко') || l.includes('0.5') || l.includes('ultrawide');
  };

  const getCssScale = () => {
    if (facingMode === "user") {
      return zoomLevel;
    }
    if (hasUltraWide && zoomLevel < 1.0 && ultraWideDeviceId) {
      return zoomLevel / 0.5;
    }
    return zoomLevel;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      baseZoomRef.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const minZoom = hasUltraWide && facingMode !== "user" ? 0.5 : 1.0;
      const maxZoom = 5.0;
      const newZoom = Math.min(maxZoom, Math.max(minZoom, baseZoomRef.current * ratio));
      setZoomLevel(Math.round(newZoom * 10) / 10);
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  const hasEnded = event.endsAt
    ? new Date() > event.endsAt.toDate()
    : false;

  // Initialize Media Stream
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    const initStream = async () => {
      try {
        setCameraError(null);

        const videoConstraints: MediaTrackConstraints = {};
        if (facingMode === "user") {
          videoConstraints.facingMode = "user";
        } else {
          // If we have selected a specific device ID (e.g. ultra-wide or normal back)
          if (zoomLevel < 1.0 && ultraWideDeviceId) {
            videoConstraints.deviceId = { exact: ultraWideDeviceId };
          } else if (zoomLevel >= 1.0 && normalBackDeviceId) {
            videoConstraints.deviceId = { exact: normalBackDeviceId };
          } else {
            videoConstraints.facingMode = "environment";
          }
        }
        videoConstraints.width = { ideal: 1080 };
        videoConstraints.height = { ideal: 1440 };

        const constraints: MediaStreamConstraints = {
          video: videoConstraints,
          audio: false,
        };
        const active = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = active;
        setStream(active);
        if (videoRef.current) {
          videoRef.current.srcObject = active;
        }

        // Enumerate devices to detect ultra-wide and normal back cameras
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === "videoinput");
        
        let uwId: string | null = null;
        let normalId: string | null = null;

        const backCameras = videoInputs.filter(
          (d) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("основная") ||
            d.label.toLowerCase().includes("задняя")
        );

        if (backCameras.length > 1) {
          let uwCamera = backCameras.find((d) => isUltraWide(d.label));
          if (!uwCamera) {
            uwCamera = backCameras[1];
          }
          if (uwCamera) {
            uwId = uwCamera.deviceId;
          }
          const normalCamera = backCameras.find((d) => d.deviceId !== uwId) || backCameras[0];
          if (normalCamera) {
            normalId = normalCamera.deviceId;
          }
        }

        if (uwId) {
          setUltraWideDeviceId(uwId);
          setHasUltraWide(true);
        }
        if (normalId) {
          setNormalBackDeviceId(normalId);
        }
      } catch (err: any) {
        console.error("Camera initialisation error:", err);
        // Fallback without environment constraints
        try {
          const fallbackConstraints = { video: true, audio: false };
          const activeFallback = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
          activeStream = activeFallback;
          setStream(activeFallback);
          if (videoRef.current) {
            videoRef.current.srcObject = activeFallback;
          }
        } catch (fallbackErr: any) {
          setCameraError(tr("Не удалось получить доступ к камере.", "Could not access camera."));
        }
      }
    };

    initStream();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, zoomLevel < 1.0, ultraWideDeviceId, normalBackDeviceId]);

  // Handle capture
  const handleShutter = async () => {
    if (capturing || shotsLeft <= 0 || !videoRef.current) return;
    setCapturing(true);

    // Play camera flash visual
    setShowFlashOverlay(true);
    setTimeout(() => setShowFlashOverlay(false), 150);

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const videoWidth = video.videoWidth || 1080;
      const videoHeight = video.videoHeight || 1440;
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get 2D canvas context");

      const scale = getCssScale();
      const sWidth = videoWidth / scale;
      const sHeight = videoHeight / scale;
      const sx = (videoWidth - sWidth) / 2;
      const sy = (videoHeight - sHeight) / 2;

      // Draw mirrored if using front camera
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      }

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setCapturing(false);
          return;
        }

        let publicUrl = "";

        // 1. Try R2 Upload
        try {
          const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
          const r2Res = await fetch("/api/r2-upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: event.id, fileName: filename }),
          });
          if (r2Res.ok) {
            const r2Data = await r2Res.json();
            const putRes = await fetch(r2Data.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "image/jpeg" },
              body: blob,
            });
            if (putRes.ok) {
              publicUrl = r2Data.displayUrl;
            }
          }
        } catch (e) {
          console.warn("R2 upload error, falling back to Firebase Storage:", e);
        }

        // 2. Firebase Storage Fallback
        if (!publicUrl) {
          try {
            const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
            const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`;
            const storageRef = ref(storage, `events/${event.id}/${filename}`);
            await uploadBytes(storageRef, blob);
            publicUrl = await getDownloadURL(storageRef);
          } catch (storageErr) {
            console.error("Firebase Storage upload error:", storageErr);
            alert("Failed to upload photo. Please check connection.");
            setCapturing(false);
            return;
          }
        }

        // 3. Write document to Firestore photos collection
        try {
          const { collection, addDoc } = await import("firebase/firestore");
          const newPhotoDoc = await addDoc(collection(db, "photos"), {
            eventId: event.id,
            imageUrl: publicUrl,
            publicUrl: publicUrl,
            uploaderId: userUid,
            uploaderName: userName,
            createdAt: serverTimestamp(),
          });

          onPhotoUploaded({
            id: newPhotoDoc.id,
            publicUrl: publicUrl,
            uploaderName: userName,
            createdAt: Timestamp.now(),
          });
        } catch (dbErr) {
          console.error("Error creating photo document:", dbErr);
        }

        setCapturing(false);
      }, "image/jpeg", 0.85);

    } catch (err) {
      console.error("Shutter capture error:", err);
      setCapturing(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#040405] flex flex-col justify-between select-none">
      {/* Top Controls */}
      <div className="relative z-10 px-5 pt-8 flex items-center justify-between text-white bg-gradient-to-b from-black/80 to-transparent pb-4">
        {/* Back button */}
        <button
          onClick={onClose}
          className="text-white active:scale-95 transition"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>

        {/* Title & Countdown */}
        <div className="text-center flex-1 mx-4">
          <h2
            className="text-[17px] font-normal leading-tight text-white tracking-wide"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {event.name}
          </h2>
          <div className="flex items-center justify-center gap-1 mt-1 text-white/50 text-[11px]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>{hasEnded ? tr("завершено", "ended") : tr(`осталось ${timeLeft}`, `${timeLeft} left`)}</span>
          </div>
        </div>

        {/* QR Button */}
        <button
          onClick={onOpenQr}
          className="text-white active:scale-95 transition"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="3" height="3" />
            <rect x="20" y="14" width="1" height="3" />
            <rect x="14" y="20" width="3" height="1" />
            <rect x="20" y="20" width="1" height="1" />
          </svg>
        </button>
      </div>

      {/* Main Camera Video View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
        {cameraError ? (
          <div className="text-center px-6">
            <p className="text-red-400 text-[14px]">{cameraError}</p>
          </div>
        ) : (
          <div
            className="w-full h-full relative touch-none"
            style={{
              transform: `scale(${getCssScale()})`,
              transition: "transform 0.15s ease-out",
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <LensFilter lens={event.lens}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              />
            </LensFilter>
          </div>
        )}

        {/* Shutter Flash visual overlay */}
        {showFlashOverlay && (
          <div className="absolute inset-0 bg-white z-20 animate-out fade-out duration-150" />
        )}
      </div>

      {/* Middle Overlaid Controls */}
      <div className="absolute bottom-36 inset-x-0 px-10 flex items-center justify-between z-10 pointer-events-auto">
        {/* Flash Toggle */}
        <button
          onClick={() => setFlashMode((f) => (f === "off" ? "on" : "off"))}
          className="text-white active:scale-95 transition p-2"
        >
          {flashMode === "on" ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </button>

        {/* Zoom Selector (Wide/Regular for Front Camera, 0.5/1.0x for Back Camera) */}
        <div className="flex items-center bg-[#0C0C0E]/60 border border-white/5 rounded-full p-0.5 backdrop-blur-md">
          {facingMode === "user" ? (
            <>
              <button
                onClick={() => setZoomLevel(1.0)}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold transition ${
                  zoomLevel < 1.15 ? "bg-white/20 text-white font-bold" : "text-white/40"
                }`}
              >
                Wide
              </button>
              <button
                onClick={() => setZoomLevel(1.3)}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold transition ${
                  zoomLevel >= 1.15 ? "bg-white/20 text-white font-bold" : "text-white/40"
                }`}
              >
                Regular
              </button>
            </>
          ) : (
            <>
              {hasUltraWide && (
                <button
                  onClick={() => setZoomLevel(0.5)}
                  className={`px-3 py-1 rounded-full text-[12px] font-semibold transition ${
                    zoomLevel < 1.0 ? "bg-white/20 text-white font-bold" : "text-white/40"
                  }`}
                >
                  {zoomLevel < 1.0 ? `${zoomLevel.toFixed(1)}` : "0.5"}
                </button>
              )}
              <button
                onClick={() => setZoomLevel(1.0)}
                className={`px-3 py-1 rounded-full text-[12px] font-semibold transition ${
                  zoomLevel >= 1.0 ? "bg-white/20 text-white font-bold" : "text-white/40"
                }`}
              >
                {zoomLevel >= 1.0 ? `${zoomLevel.toFixed(1)}x` : "1.0x"}
              </button>
            </>
          )}
        </div>

        {/* Flip Camera */}
        <button
          onClick={toggleCamera}
          className="text-white active:scale-95 transition p-2"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20a10 10 0 0 0-16-8m16 8v-5M4 4a10 10 0 0 0 16 8M4 4v5" />
          </svg>
        </button>
      </div>

      {/* Bottom Shutter Panel Capsule */}
      <div className="pb-8 pt-4 bg-black/90 flex items-center justify-center z-10">
        <div className="w-[90%] h-28 bg-[#151517] rounded-[32px] border border-white/5 flex items-center justify-between px-6 shadow-2xl">
          {/* Film Wheel Counter (Left) */}
          <div className="relative h-[52px] w-[76px] bg-[#0C0C0E] rounded-xl flex items-center justify-between px-2.5 border border-white/5 overflow-hidden">
            <div className="text-white/40">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 3v18M17 3v18M3 7.5h4M3 12h4M3 16.5h4M17 7.5h4M17 12h4M17 16.5h4" />
              </svg>
            </div>
            <div className="flex flex-col items-center justify-center h-full relative w-8 overflow-hidden select-none">
              <div className="text-[10px] text-white/20 font-serif italic absolute top-0.5">{shotsLeft + 1}</div>
              <div className="text-[18px] text-white font-bold italic font-serif" style={{ fontFamily: "Georgia, serif" }}>{shotsLeft}</div>
              <div className="text-[10px] text-white/20 font-serif italic absolute bottom-0.5">{shotsLeft - 1 >= 0 ? shotsLeft - 1 : ""}</div>
            </div>
          </div>

          {/* Shutter Button (Center) */}
          <button
            onClick={handleShutter}
            disabled={capturing || shotsLeft <= 0}
            className="w-[72px] h-[72px] rounded-full bg-white border-[6px] border-black ring-[3px] ring-white flex items-center justify-center active:scale-95 transition disabled:opacity-40"
          >
            {capturing && (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
            )}
          </button>

          {/* Polaroid Deck Gallery Stack (Right) */}
          <div className="relative w-[76px] h-[52px] flex items-center justify-center overflow-visible">
            {lastPhotoUrl ? (
              <>
                <div className="absolute w-[38px] h-[50px] rounded-md overflow-hidden border border-white/20 shadow-md rotate-[8deg] translate-x-1 opacity-60">
                  <img src={resolveImageUrl(lastPhotoUrl)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute w-[38px] h-[50px] rounded-md overflow-hidden border border-white/20 shadow-lg -rotate-[4deg] bg-[#1C1C1E] flex items-center justify-center">
                  <img src={resolveImageUrl(lastPhotoUrl)} alt="" className="w-full h-full object-cover" />
                </div>
              </>
            ) : (
              <div className="absolute w-[38px] h-[50px] rounded-md overflow-hidden border border-white/20 shadow-lg bg-[#1C1C1E] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-white/35">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Invite Bottom Sheet (QR Drawer) ────────────────────────── */
function InviteBottomSheet({
  event,
  onClose,
  tr,
}: {
  event: EventData;
  onClose: () => void;
  tr: (ru: string, en: string) => string;
}) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.protocol}//${window.location.host}/join/${event.code}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveQr = () => {
    const svg = document.querySelector("#invite-qr-svg");
    if (svg) {
      const svgString = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        if (context) {
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, 512, 512);
          context.drawImage(image, 32, 32, 448, 448);
          const png = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = png;
          downloadLink.download = `snapix_${event.name.replace(/\s+/g, "_")}_qr.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
        }
      };
      image.src = blobURL;
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Dimmed Background Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-up Container Sheet */}
      <div
        className="relative z-10 w-full bg-[#1C1C1E] border-t border-white/10 rounded-t-[28px] p-6 text-center select-none shadow-2xl animate-in slide-in-from-bottom duration-300 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="w-10 h-1 bg-white/15 mx-auto rounded-full mb-6" />

        {/* Title & Desc */}
        <h3 className="text-white text-[24px] font-bold tracking-tight text-left">
          {tr("Пригласить участников", "Invite guests")}
        </h3>
        <p className="text-white/50 text-[14px] text-left mt-2 leading-snug">
          {tr(
            "Снимайте мир глазами друг друга. Поделитесь QR кодом или ссылкой на фильм.",
            "Glimpse the world through each other's eyes. Share the QR code or link."
          )}
        </p>

        {/* Divider */}
        <div className="h-px bg-white/5 my-5" />

        {/* QR Code SVG Image */}
        <div className="bg-white rounded-2xl p-4 w-[210px] h-[210px] mx-auto flex items-center justify-center shadow-lg mb-6">
          <QRCodeSVG id="invite-qr-svg" value={inviteUrl} size={178} level="M" />
        </div>

        {/* Action Buttons Row */}
        <div className="flex gap-4">
          {/* Copy Link */}
          <button
            onClick={handleCopy}
            className="flex-1 h-[52px] rounded-xl bg-white/5 border border-white/5 text-white text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            {copied ? tr("Скопировано!", "Copied!") : tr("Ссылка", "Copy Link")}
          </button>

          {/* Download QR */}
          <button
            onClick={handleSaveQr}
            className="flex-1 h-[52px] rounded-xl bg-white/5 border border-white/5 text-white text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {tr("Сохранить QR", "Save QR")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Select Frames Bottom Sheet (Save/Share Drawer) ─────────── */
function SelectFramesBottomSheet({
  event,
  photos,
  onClose,
  tr,
  isRu,
  downloadPhoto,
}: {
  event: EventData;
  photos: PhotoData[];
  onClose: () => void;
  tr: (ru: string, en: string) => string;
  isRu: boolean;
  downloadPhoto: (url: string, filename: string) => Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    photos.map((p) => p.id)
  );

  const allSelected = selectedIds.length === photos.length;

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(photos.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: tr("Посмотрите наши моменты из фильма!", "Check out our film moments!"),
          url: shareUrl,
        });
      } catch (e) {
        console.error("Web Share failed:", e);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert(tr("Ссылка на фильм скопирована в буфер обмена!", "Film link copied to clipboard!"));
    }
  };

  const handleDownloadSelected = async () => {
    const selectedPhotos = photos.filter((p) => selectedIds.includes(p.id));
    selectedPhotos.forEach((p, i) => {
      setTimeout(() => {
        downloadPhoto(
          p.publicUrl,
          `snapix_${event.name.replace(/\s+/g, "_")}_${i + 1}.jpg`
        );
      }, i * 500);
    });
    onClose();
  };

  const getKadrovWord = (count: number) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod100 >= 11 && mod100 <= 19) {
      return tr("кадров", "frames");
    }
    if (mod10 === 1) {
      return tr("кадр.", "frame");
    }
    if (mod10 >= 2 && mod10 <= 4) {
      return tr("кадра", "frames");
    }
    return tr("кадров", "frames");
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Dimmed Background Overlay */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
      />

      {/* Slide-up Container Sheet */}
      <div
        className="relative z-10 w-full bg-[#1C1C1E] border-t border-white/10 rounded-t-[28px] p-6 text-left select-none shadow-2xl animate-in slide-in-from-bottom duration-300 ease-out flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* iOS Drag Handle */}
        <div className="w-10 h-1 bg-white/15 mx-auto rounded-full mb-4 shrink-0" />

        {/* Header Row */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h3
            className="text-white text-[20px] font-normal leading-tight font-serif"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            {tr("Выберите кадры", "Select frames")}
          </h3>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 active:scale-95 transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Toggle All Selection Row */}
        <div className="flex items-center gap-3 mb-4 shrink-0">
          <button
            onClick={handleToggleAll}
            className={`h-5 w-5 rounded-md flex items-center justify-center border transition ${
              allSelected
                ? "bg-[#82C0E8] border-[#82C0E8] text-black"
                : "bg-[#2C2C2E] border-white/20 text-transparent"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
          <span
            className="text-[14px] text-white/70 select-none cursor-pointer"
            onClick={handleToggleAll}
          >
            {tr("Выбрать все", "Select all")}
          </span>
        </div>

        {/* Photo Checklist Grid Container */}
        <div className="flex-1 overflow-y-auto px-1 py-1 grid grid-cols-2 gap-3 mb-4">
          {photos.map((photo) => {
            const isSelected = selectedIds.includes(photo.id);
            return (
              <div
                key={photo.id}
                onClick={() => toggleSelect(photo.id)}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden group select-none border border-white/5 cursor-pointer"
              >
                {/* Photo with lens filter */}
                <div className="w-full h-full">
                  <LensFilter lens={event.lens}>
                    <img
                      src={resolveImageUrl(photo.publicUrl)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </LensFilter>
                </div>

                {/* Top-Right Checkbox */}
                <div className="absolute top-3.5 right-3.5 z-20">
                  <div
                    className={`h-[22px] w-[22px] rounded-full flex items-center justify-center border transition shadow-md ${
                      isSelected
                        ? "bg-[#82C0E8] border-[#82C0E8] text-black"
                        : "bg-black/40 border-white/40 text-transparent"
                    }`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>

                {/* Bottom-Left Uploader Name Tag */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent pt-8 pb-3 px-4 z-10">
                  <span
                    className="text-[13px] text-white/95 font-medium italic"
                    style={{ fontFamily: "Georgia, serif" }}
                  >
                    {photo.uploaderName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions Row */}
        <div className="flex gap-3 pt-4 border-t border-white/10 shrink-0">
          {/* Share */}
          <button
            onClick={handleShare}
            className="flex-1 h-12 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] active:scale-95 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {tr("Поделиться", "Share")}
          </button>

          {/* Download Selected */}
          <button
            onClick={handleDownloadSelected}
            disabled={selectedIds.length === 0}
            className="flex-1 h-12 bg-[#82C0E8] disabled:opacity-40 disabled:pointer-events-none hover:bg-[#97D0F5] rounded-full flex items-center justify-center gap-2 text-black font-semibold text-[14px] active:scale-95 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {tr(
              `Сохранить ${selectedIds.length} ${getKadrovWord(selectedIds.length)}`,
              `Save ${selectedIds.length} ${selectedIds.length === 1 ? "frame" : "frames"}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────────── */
function formatShortDate(date?: Date, isRu?: boolean): string {
  if (!date) return "";
  return date.toLocaleDateString(isRu ? "ru-RU" : "en-US", {
    month: "short",
    day: "numeric",
  });
}
