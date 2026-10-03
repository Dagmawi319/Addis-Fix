import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, MapPin, Check, X, RefreshCw, Loader2, AlertTriangle, Sparkles, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import api, { fileRawUrl, formatApiError } from "@/lib/api";
import MapView from "@/components/MapView";

const STEPS = ["Photo", "Location", "Details", "Review"];

export default function ReportPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState([]);
  const [fileId, setFileId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locText, setLocText] = useState("");
  const [geoError, setGeoError] = useState("");
  const [form, setForm] = useState({ title: "", description: "", category: "", severity: "medium" });
  const [submitting, setSubmitting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { api.get("/categories").then(({ data }) => setCategories(data)).catch(() => {}); }, []);
  useEffect(() => () => stopCamera(), []);

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCameraOn(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraOn(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
    } catch {
      toast.error("Camera permission denied", { description: "You can upload a photo instead." });
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      stopCamera();
      await uploadBlob(new File([blob], "capture.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  const uploadBlob = async (file) => {
    setUploading(true); setAi(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setFileId(data.id);
      setPreview(fileRawUrl(data.id));
      runAi(data.id);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
    setUploading(false);
  };

  const runAi = async (id) => {
    setAiLoading(true);
    try {
      const { data } = await api.post(`/ai/analyze/${id}`);
      setAi(data);
      if (data.available) {
        setForm((f) => ({ ...f, category: f.category || data.category, severity: data.severity || f.severity, description: f.description || data.description }));
      }
    } catch { setAi({ available: false, message: "AI analysis is currently unavailable." }); }
    setAiLoading(false);
  };

  const detectLocation = () => {
    setGeoError("");
    if (!navigator.geolocation) { setGeoError("Geolocation not supported. Pick a point on the map."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Location permission denied. Tap the map to set the location manually."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const submit = async () => {
    if (!coords) { toast.error("Please set a location first."); setStep(1); return; }
    if (!form.title || !form.description || !form.category) { toast.error("Please complete the details."); setStep(2); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/reports", {
        title: form.title, description: form.description, category: form.category, severity: form.severity,
        image_ids: fileId ? [fileId] : [], latitude: coords.lat, longitude: coords.lng, location_description: locText,
      });
      toast.success("Report submitted!", { description: data.match?.linked ? "Linked to an existing incident." : "A new incident was created." });
      navigate(`/incidents/${data.incident_id}`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
      setSubmitting(false);
    }
  };

  const canNext = [true, !!coords, form.title && form.description && form.category, true][step];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl p-5 sm:p-8">
        <h1 className="font-display text-2xl font-bold text-white">Report a Problem</h1>
        <p className="text-sm text-slate-400">Take a photo, add a location, and tell us what's happening.</p>

        {/* Stepper */}
        <div className="mt-6 flex items-center justify-between">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1" data-testid={`step-${i}`}>
                <div className={`grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-bold ${i <= step ? "border-[#19C3C9] text-[#19C3C9]" : "border-[#1E2C4A] text-slate-500"} ${i < step ? "bg-[#19C3C9] text-[#04131a]" : ""}`}>
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs ${i <= step ? "text-slate-200" : "text-slate-500"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`mx-1 h-0.5 flex-1 ${i < step ? "bg-[#19C3C9]" : "bg-[#1E2C4A]"}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-8">
          {/* Step 0: Photo */}
          {step === 0 && (
            <div className="space-y-4">
              {cameraOn ? (
                <div className="space-y-3">
                  <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl bg-black" />
                  <div className="flex gap-2">
                    <button data-testid="camera-capture-btn" onClick={capturePhoto} className="btn-teal flex-1 rounded-lg py-2.5 text-sm font-bold">Capture</button>
                    <button onClick={stopCamera} className="rounded-lg border border-[#1E2C4A] px-4 py-2.5 text-sm text-slate-300">Cancel</button>
                  </div>
                </div>
              ) : preview ? (
                <div className="space-y-3">
                  <div className="relative overflow-hidden rounded-xl">
                    <img src={preview} alt="preview" className="max-h-80 w-full object-cover" />
                    {uploading && <div className="absolute inset-0 grid place-items-center bg-black/50"><Loader2 className="h-6 w-6 animate-spin text-white" /></div>}
                  </div>
                  <div className="flex gap-2">
                    <button data-testid="change-photo-btn" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-[#1E2C4A] px-4 py-2 text-sm text-slate-300"><RefreshCw className="h-4 w-4" /> Change photo</button>
                    <button onClick={() => { setPreview(null); setFileId(null); setAi(null); }} className="flex items-center gap-2 rounded-lg border border-[#1E2C4A] px-4 py-2 text-sm text-slate-300"><X className="h-4 w-4" /> Remove</button>
                  </div>
                  {/* AI card */}
                  {(aiLoading || ai) && (
                    <div data-testid="ai-card" className="rounded-xl border border-[#19C3C9]/40 bg-[#17233B]/80 p-4 backdrop-blur-md">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#19C3C9]"><Sparkles className="h-4 w-4" /> Detected Information (AI)</div>
                      {aiLoading ? (
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing image…</div>
                      ) : ai?.available ? (
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-slate-400">Category</span><span className="font-medium text-slate-200">{categories.find((c) => c.key === ai.category)?.name || ai.category}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Severity</span><span className="font-medium capitalize text-slate-200">{ai.severity}</span></div>
                          <div className="text-slate-300">{ai.description}</div>
                          {ai.confidence != null && <div className="text-xs text-slate-500">Model self-assessed confidence: {(ai.confidence * 100).toFixed(0)}% · assistive only, human review required</div>}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2 text-sm text-amber-400"><AlertTriangle className="h-4 w-4" /> {ai?.message || "AI analysis is currently unavailable."}</div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <button data-testid="open-camera-btn" onClick={startCamera} className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#1E2C4A] py-10 text-slate-300 hover:border-[#19C3C9]">
                    <Camera className="h-8 w-8 text-[#19C3C9]" /> Use Camera
                  </button>
                  <button data-testid="upload-photo-btn" onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#1E2C4A] py-10 text-slate-300 hover:border-[#19C3C9]">
                    <Upload className="h-8 w-8 text-[#19C3C9]" /> Upload Photo
                  </button>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadBlob(e.target.files[0])} data-testid="file-input" />
              <p className="text-xs text-slate-500">A photo is recommended but optional. You can continue without one.</p>
            </div>
          )}

          {/* Step 1: Location */}
          {step === 1 && (
            <div className="space-y-4">
              <button data-testid="detect-location-btn" onClick={detectLocation} className="flex items-center gap-2 rounded-lg border border-[#19C3C9] px-4 py-2 text-sm font-semibold text-[#19C3C9]"><MapPin className="h-4 w-4" /> Use my current location</button>
              {geoError && <p className="text-sm text-amber-400">{geoError}</p>}
              <div className="h-72 overflow-hidden rounded-xl border border-[#1E2C4A]">
                <PickerMap coords={coords} onPick={(c) => setCoords(c)} />
              </div>
              {coords && <p className="font-mono text-xs text-slate-400">{coords.lat.toFixed(5)} N, {coords.lng.toFixed(5)} E</p>}
              <input data-testid="location-text" value={locText} onChange={(e) => setLocText(e.target.value)} placeholder="Location description (e.g. Bole, near the junction)" className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" />
              <p className="text-xs text-slate-500">Tap anywhere on the map to set the exact spot.</p>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-400">Title</label>
                <input data-testid="report-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short summary of the problem" className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Category</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {categories.map((c) => (
                    <button key={c.key} data-testid={`category-${c.key}`} onClick={() => setForm({ ...form, category: c.key })} className={`rounded-lg border px-3 py-2 text-sm ${form.category === c.key ? "border-[#19C3C9] text-white" : "border-[#1E2C4A] text-slate-300"}`}>
                      <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} /> {c.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Severity</label>
                <div className="flex gap-2">
                  {["low", "medium", "high"].map((s) => (
                    <button key={s} data-testid={`severity-${s}`} onClick={() => setForm({ ...form, severity: s })} className={`flex-1 rounded-lg border px-3 py-2 text-sm capitalize ${form.severity === s ? "border-[#19C3C9] text-white" : "border-[#1E2C4A] text-slate-300"}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-400">Description</label>
                <textarea data-testid="report-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the problem…" className="w-full rounded-lg border border-[#1E2C4A] bg-[#0B1220] px-3 py-2 text-sm text-slate-200" />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4" data-testid="review-step">
              {preview && <img src={preview} alt="" className="max-h-60 w-full rounded-xl object-cover" />}
              <div className="card-dark divide-y divide-[#1E2C4A] p-0 text-sm">
                {[
                  ["Title", form.title],
                  ["Category", categories.find((c) => c.key === form.category)?.name || "—"],
                  ["Severity", form.severity],
                  ["Location", coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : "—"],
                  ["Description", form.description],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3"><span className="text-slate-400">{k}</span><span className="text-right text-slate-200">{v}</span></div>
                ))}
              </div>
              <p className="text-xs text-slate-500">By submitting, you agree your report may be shown publicly (without your identity) and reviewed by authorized staff.</p>
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="mt-8 flex justify-between">
          <button data-testid="step-back-btn" disabled={step === 0} onClick={() => setStep(step - 1)} className="rounded-lg border border-[#1E2C4A] px-5 py-2.5 text-sm text-slate-300 disabled:opacity-40">Back</button>
          {step < 3 ? (
            <button data-testid="step-next-btn" disabled={!canNext} onClick={() => setStep(step + 1)} className="btn-teal inline-flex items-center gap-1 rounded-lg px-6 py-2.5 text-sm font-bold disabled:opacity-50">Next <ChevronRight className="h-4 w-4" /></button>
          ) : (
            <button data-testid="submit-report-btn" disabled={submitting} onClick={submit} className="btn-teal inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold disabled:opacity-60">{submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit Report"}</button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

// Lightweight click-to-pick leaflet map
import L from "leaflet";
import "leaflet/dist/leaflet.css";
function PickerMap({ coords, onPick }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  useEffect(() => {
    if (mapRef.current || !ref.current) return;
    const map = L.map(ref.current).setView([coords?.lat || 9.0108, coords?.lng || 38.7613], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    map.on("click", (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);
    return () => { map.remove(); mapRef.current = null; };
  }, []); // eslint-disable-line
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    if (markerRef.current) markerRef.current.setLatLng([coords.lat, coords.lng]);
    else markerRef.current = L.marker([coords.lat, coords.lng]).addTo(mapRef.current);
    mapRef.current.setView([coords.lat, coords.lng], 15);
  }, [coords]);
  return <div ref={ref} className="h-full w-full" data-testid="picker-map" />;
}
