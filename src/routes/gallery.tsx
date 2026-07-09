import { createFileRoute, Link } from "@tanstack/react-router";
import { Frame } from "@/components/snapix/Frame";
import { BackLink } from "@/components/snapix/ui";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const Route = createFileRoute("/gallery")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: (search.id as string) || "",
      code: (search.code as string) || "",
    };
  },
  head: () => ({ meta: [{ title: "Reel — Snapix" }] }),
  component: Gallery,
});

interface EventData {
  id: string;
  name: string;
  startsAt: any;
  endsAt: any;
  revealMode: string;
  participants: string[];
}

interface PhotoData {
  id: string;
  publicUrl: string;
  uploaderName: string;
  createdAt: any;
}

function Gallery() {
  const { id, code } = Route.useSearch();
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isDeveloped, setIsDeveloped] = useState(false);

  // Subscribe to Event and Photos
  useEffect(() => {
    let unsubscribePhotos: () => void = () => {};
    let unsubscribeEvent: () => void = () => {};

    const loadData = async () => {
      try {
        let eventDocId = id;

        // If we only have the invite code, look up the event ID first
        if (!eventDocId && code) {
          const eventsRef = collection(db, "events");
          const q = query(eventsRef, where("code", "==", code.toUpperCase()));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            eventDocId = querySnapshot.docs[0].id;
          }
        }

        if (!eventDocId) {
          setLoading(false);
          return;
        }

        // Subscribe to event document
        const eventRef = doc(db, "events", eventDocId);
        unsubscribeEvent = onSnapshot(eventRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const eventData: EventData = {
              id: docSnap.id,
              name: data.name || "Untitled Film",
              startsAt: data.startsAt,
              endsAt: data.endsAt,
              revealMode: data.revealMode || "after",
              participants: data.participants || [],
            };
            setEvent(eventData);

            // Check if developed
            const endsAtDate = eventData.endsAt?.toDate() || new Date();
            const isDev = eventData.revealMode === "during" || new Date() > endsAtDate;
            setIsDeveloped(isDev);
          }
        });

        // Subscribe to photos collection
        const photosRef = collection(db, "photos");
        const photosQuery = query(
          photosRef,
          where("eventId", "==", eventDocId)
        );

        unsubscribePhotos = onSnapshot(photosQuery, (snapshot) => {
          const list: PhotoData[] = [];
          snapshot.forEach((pDoc) => {
            const pData = pDoc.data();
            list.push({
              id: pDoc.id,
              publicUrl: pData.publicUrl,
              uploaderName: pData.uploaderName || "Guest",
              createdAt: pData.createdAt,
            });
          });
          // Sort client-side by createdAt descending (newest first)
          list.sort((a, b) => {
            const timeA = a.createdAt?.toDate().getTime() || 0;
            const timeB = b.createdAt?.toDate().getTime() || 0;
            return timeB - timeA;
          });
          setPhotos(list);
          setLoading(false);
        });

      } catch (err) {
        console.error("Error subscribing to Firestore:", err);
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubscribeEvent();
      unsubscribePhotos();
    };
  }, [id, code]);

  // Countdown timer effect
  useEffect(() => {
    if (!event || isDeveloped) return;

    const timer = setInterval(() => {
      const endsAtDate = event.endsAt?.toDate();
      if (!endsAtDate) return;

      const diff = endsAtDate.getTime() - new Date().getTime();
      if (diff <= 0) {
        setIsDeveloped(true);
        setTimeLeft("");
        clearInterval(timer);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hoursStr = hours.toString().padStart(2, "0");
      const minutesStr = minutes.toString().padStart(2, "0");
      const secondsStr = seconds.toString().padStart(2, "0");

      setTimeLeft(`${hoursStr}:${minutesStr}:${secondsStr}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [event, isDeveloped]);

  if (loading) {
    return (
      <Frame>
        <div className="flex flex-col min-h-screen items-center justify-center bg-black">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-white" />
          <p className="mt-4 text-[13px] text-muted-foreground">Loading film reel...</p>
        </div>
      </Frame>
    );
  }

  if (!event) {
    return (
      <Frame>
        <div className="flex flex-col min-h-screen items-center justify-center p-6 text-center">
          <h1 className="font-display italic text-[24px]">Film Not Found</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Please make sure you have the correct link or invite code.
          </p>
          <Link to="/" className="mt-6 px-6 py-2.5 rounded-full bg-white text-black font-semibold text-[13px]">
            Go Home
          </Link>
        </div>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="flex flex-col min-h-screen">
        <div className="px-4 pt-4 flex items-center justify-between">
          <BackLink to="/" />
          <div className="text-center">
            <p className="font-display italic text-[18px]">{event.name}</p>
            <p className="text-[11px] text-success">
              ● {event.participants.length} camera{event.participants.length !== 1 ? "s" : ""} live
            </p>
          </div>
          <span className="w-9" />
        </div>

        {photos.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <p className="text-[15px] font-display italic">No frames captured yet.</p>
            <p className="mt-1 text-[12px] text-muted-foreground max-w-[200px]">
              Be the first to capture a memory on this film!
            </p>
          </div>
        ) : (
          <div className="px-3 pt-4 grid grid-cols-2 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-2xl overflow-hidden bg-elevated relative">
                <img
                  src={photo.publicUrl}
                  alt={`Captured by ${photo.uploaderName}`}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                
                {/* Photo Blur Overlay if event has not developed */}
                {!isDeveloped && (
                  <div className="absolute inset-0 bg-background/30 backdrop-blur-md flex flex-col items-center justify-center text-center p-3">
                    <span className="text-[10px] text-white/55 font-semibold uppercase tracking-wider">
                      By {photo.uploaderName}
                    </span>
                    <span className="mt-1 text-[12px] text-white font-medium">
                      Develops soon
                    </span>
                    {timeLeft && (
                      <span className="mt-1 text-[11px] text-muted-foreground font-mono">
                        {timeLeft}
                      </span>
                    )}
                  </div>
                )}
                
                {isDeveloped && (
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                    <p className="text-[10px] text-white/90">
                      by {photo.uploaderName}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="h-32" />
      </div>
    </Frame>
  );
}
