import { useState, useEffect } from "react";
import heroLogo from "./hero-logo.png";

const API_BASE = "";

const PLATFORMS = [
  { name: "Instagram", ratio: "1:1",  width: 1080, height: 1080 },
  { name: "WhatsApp",  ratio: "9:16", width: 1080, height: 1920 },
  { name: "Facebook",  ratio: "4:3",  width: 1200, height: 900  },
  { name: "Poster",    ratio: "3:4",  width: 900,  height: 1200 },
];

const LANGUAGES = [
  "English","Hindi","Kannada","Gujarati","Bengali","Marathi",
  "Tamil","Telugu","Malayalam","Assamese","Punjabi","Odia",
];

const OFFER_TYPES = [
  { id: "exchange_bonus",      label: "Exchange Bonus",        hasValue: true  },
  { id: "cash_discount",       label: "Cash Discount",         hasValue: true  },
  { id: "loyalty_bonus",       label: "Loyalty Bonus",         hasValue: true  },
  { id: "corporate_discount",  label: "Corporate Discount",    hasValue: true  },
  { id: "insurance_benefit",   label: "Insurance Benefit",     hasValue: true  },
  { id: "emi_benefit",         label: "EMI Benefit",           hasValue: true  },
  { id: "accessories_benefit", label: "Accessories Benefit",   hasValue: true  },
  { id: "test_ride_bonus",     label: "Test Ride Bonus",       hasValue: true  },
  { id: "extended_warranty",   label: "Extended Warranty",     hasValue: false },
  { id: "free_service",        label: "Free Service",          hasValue: false },
  { id: "free_helmet",         label: "Free Helmet",           hasValue: false },
  { id: "zero_down_payment",   label: "Zero Down Payment",     hasValue: false },
  { id: "special_finance",     label: "Special Finance Offer", hasValue: false },
];

const OFFER_VALUE_TYPES = ["STARTING", "UPTO", "FLAT"];

// ─── Icons ───────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1.5 5.5L4.5 8.5L9.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SpinnerIcon = ({ size = 22, color = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none" className="spin">
    <circle cx="11" cy="11" r="9" stroke="rgba(128,128,128,0.25)" strokeWidth="2.5"/>
    <path d="M11 2a9 9 0 0 1 9 9" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
  </svg>
);

// ─── Step wrapper ─────────────────────────────────────────────────────────────
function Step({ n, label, done, children }) {
  return (
    <div className={`step${done ? " step-done" : ""}`}>
      <div className="step-hd">
        <div className={`step-num${done ? " done" : ""}`}>{done ? <CheckIcon /> : n}</div>
        <span className="step-lbl">{label}</span>
        {done && <span className="step-tick">✓</span>}
      </div>
      <div className="step-bd">{children}</div>
    </div>
  );
}

const DEFAULT_GUIDELINES = {
  brand_name: "",
  guidelines: "",
  negative_prompt: "",
  apply_to_image: true,
  apply_to_video: false,
};

// ─── Sidebar component ────────────────────────────────────────────────────────
function Sidebar({ activeView, onViewChange }) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <div className="sb-nav">
        <button
          type="button"
          className={`sb-item${activeView === "image" ? " active" : ""}`}
          aria-current={activeView === "image" ? "page" : undefined}
          onClick={() => onViewChange("image")}
        >
          Image
        </button>
        <button
          type="button"
          className={`sb-item${activeView === "video" ? " active" : ""}`}
          aria-current={activeView === "video" ? "page" : undefined}
          onClick={() => onViewChange("video")}
        >
          Video
        </button>
        <button
          type="button"
          className={`sb-item${activeView === "brand" ? " active" : ""}`}
          aria-current={activeView === "brand" ? "page" : undefined}
          onClick={() => onViewChange("brand")}
        >
          Brand Guidelines
        </button>
      </div>
    </aside>
  );
}

// ─── Image generator ──────────────────────────────────────────────────────────
function ImageGenerator() {
  // Asset data from API
  const [segments,      setSegments]      = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(true);

  // Selections
  const [segment,  setSegment]  = useState(null);
  const [model,    setModel]    = useState(null);
  const [color,    setColor]    = useState(null);   // { id, name, url }
  const [festival, setFestival] = useState(null);   // string e.g. "Diwali"
  const [language, setLanguage] = useState("English");
  const [campaignHeader, setCampaignHeader] = useState("");
  // Offers: checkbox-based selection of predefined offers (max 3 total incl. custom)
  const [selectedOfferIds,    setSelectedOfferIds]    = useState([]);
  const [offerDetails,        setOfferDetails]        = useState({}); // { [id]: { valueType, amount } }
  const [customOfferText,     setCustomOfferText]     = useState("");
  const [translatedOffers,    setTranslatedOffers]    = useState({}); // { [id | "custom"]: translated }
  const [translatingOffers,   setTranslatingOffers]   = useState(false);
  const [translateOffersError,setTranslateOffersError]= useState("");
  const [dealerAddress, setDealerAddress] = useState("");
  const [platform,       setPlatform]       = useState(null);

  // Generation
  const [generating,    setGenerating]    = useState(false);
  const [generated,     setGenerated]     = useState(false);
  const [result,        setResult]        = useState(null);
  const [generateError,  setGenerateError]  = useState("");
  const [generateDetail, setGenerateDetail] = useState("");

  // Post-generation text editing
  const [editHeader,  setEditHeader]  = useState("");
  const [editOffers,  setEditOffers]  = useState([""]);   // plain strings in edit mode
  const [editAddress, setEditAddress] = useState("");
  const [editing,     setEditing]     = useState(false);
  const [editError,   setEditError]   = useState("");

  // Load assets on mount
  useEffect(() => {
    const load = async () => {
      try {
        const segsRes  = await fetch(`${API_BASE}/api/assets/segments`);
        const segsData = await segsRes.json();
        setSegments(segsData);
        if (segsData.length > 0) setSegment(segsData[0].id);
      } catch (_) {
        // silently handled — empty states render gracefully
      } finally {
        setLoadingAssets(false);
      }
    };
    load();
  }, []);

  // Derived
  const currentSegmentObj = segments.find(s => s.id === segment) || null;
  const currentModels     = currentSegmentObj ? currentSegmentObj.models : [];
  const currentModelObj   = currentModels.find(m => m.id === model) || null;
  const currentColors     = currentModelObj ? currentModelObj.colors : [];
  const canGenerate       = !!(model && color && festival && platform) && !generating;

  const computeOfferText = (id) => {
    const type   = OFFER_TYPES.find(o => o.id === id);
    if (!type) return "";
    const detail = offerDetails[id] || {};
    if (type.hasValue && detail.amount?.trim()) {
      return `${detail.valueType || "UPTO"} ₹${detail.amount.trim()} ${type.label}`;
    }
    return type.label;
  };

  const totalOfferSlots  = selectedOfferIds.length + (customOfferText.trim() ? 1 : 0);
  const finalOfferTexts  = [
    ...selectedOfferIds.map(id => translatedOffers[id] || computeOfferText(id)),
    ...(customOfferText.trim() ? [translatedOffers["custom"] || customOfferText.trim()] : []),
  ].slice(0, 3).filter(Boolean);

  const handleSegment = (s) => { setSegment(s); setModel(null); setColor(null); };
  const handleModel   = (m) => { setModel(m); setColor(null); };

  const handleLanguageChange = (val) => {
    setLanguage(val);
    setTranslatedOffers({});
    setTranslateOffersError("");
  };

  const toggleOffer = (id) => {
    setSelectedOfferIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      const customSlots = customOfferText.trim() ? 1 : 0;
      if (prev.length + customSlots >= 3) return prev;
      return [...prev, id];
    });
    setTranslatedOffers(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const updateOfferDetail = (id, field, val) => {
    setOfferDetails(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [field]: val } }));
    setTranslatedOffers(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const translateAllOffers = async () => {
    if (language === "English") return;
    setTranslatingOffers(true);
    setTranslateOffersError("");
    const toTranslate = [
      ...selectedOfferIds.map(id => ({ key: id, text: computeOfferText(id) })),
      ...(customOfferText.trim() ? [{ key: "custom", text: customOfferText.trim() }] : []),
    ];
    const results = {};
    let anyError = false;
    for (const { key, text } of toTranslate) {
      try {
        const res  = await fetch(`${API_BASE}/api/translate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language }),
        });
        const data = await res.json();
        if (res.ok) results[key] = data.translated;
        else anyError = true;
      } catch (_) { anyError = true; }
    }
    setTranslatedOffers(prev => ({ ...prev, ...results }));
    if (anyError) setTranslateOffersError("Some offers could not be translated.");
    setTranslatingOffers(false);
  };

  const handleDownload = async () => {
    if (!result) return;
    try {
      const res  = await fetch(`${API_BASE}${result.url}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (_) {}
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    setGenerated(false);
    setResult(null);
    setGenerateError("");
    setGenerateDetail("");
    setEditError("");
    try {
      const res = await fetch(`${API_BASE}/api/generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bike_id:         model,
          bike_name:       model,
          color_id:        color.id,
          color_name:      color.name,
          festival:        festival,
          campaign_header: "",
          offers:          finalOfferTexts,
          dealer_address:  dealerAddress,
          platform_name:   platform.name,
          platform_width:  platform.width,
          platform_height: platform.height,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError("Not Able To Generate Image");
        setGenerateDetail(data.detail || "");
      } else {
        setResult(data);
        setGenerated(true);
        // Pre-fill edit panel with what was actually rendered
        setEditHeader(campaignHeader);
        setEditOffers(finalOfferTexts.length > 0 ? finalOfferTexts : [""]);
        setEditAddress(dealerAddress);
      }
    } catch (err) {
      setGenerateError("Not Able To Generate Image");
      setGenerateDetail(err.message || "");
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!result?.base_filename || editing) return;
    setEditing(true);
    setEditError("");
    try {
      const res = await fetch(`${API_BASE}/api/edit/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_filename:   result.base_filename,
          campaign_header: "",
          offers:          editOffers.filter(o => o.trim()),
          dealer_address:  editAddress,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.detail || "Could not apply changes");
      } else {
        // Swap poster URL in-place — download button follows automatically
        setResult(prev => ({ ...prev, filename: data.filename, url: data.url }));
      }
    } catch (err) {
      setEditError(err.message || "Could not apply changes");
    } finally {
      setEditing(false);
    }
  };

  return (
      <div className="layout">
        {/* ── Left panel ─────────────────────────────────────────────────── */}
        <div className="left">

          {/* STEP 1 */}
          <Step n={1} label="Select Segment & Model" done={!!model}>
            {loadingAssets ? (
              <div className="loading-row"><SpinnerIcon size={16} color="var(--acc)" /> Loading models...</div>
            ) : (
              <>
                <div className="seg-tabs">
                  {segments.map(s => (
                    <button key={s.id} className={`tab${segment === s.id ? " tab-on" : ""}`} onClick={() => handleSegment(s.id)}>
                      {s.name}
                    </button>
                  ))}
                </div>
                <div className="model-grid">
                  {currentModels.map(m => (
                    <button key={m.id} className={`model-card${model === m.id ? " sel" : ""}`} onClick={() => handleModel(m.id)}>
                      <div className="model-thumb">
                        <img
                          src={m.url}
                          alt={m.name}
                          className="thumb-img"
                          onError={e => { e.target.style.display = "none"; }}
                        />
                      </div>
                      <span className="model-nm">{m.name}</span>
                      {model === m.id && <div className="chk-badge"><CheckIcon /></div>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Step>

          {/* STEP 2 */}
          <Step n={2} label="Choose Color Variant" done={!!color}>
            {!model
              ? <p className="hint">Select a model above to see color variants</p>
              : currentColors.length === 0
              ? <p className="hint">No color images found for this model</p>
              : (
                <div className="color-grid">
                  {currentColors.map(c => (
                    <button key={c.id} className={`color-card${color?.id === c.id ? " sel" : ""}`} onClick={() => setColor(c)}>
                      <div className="color-swatch">
                        <img
                          src={c.url}
                          alt={c.name}
                          className="swatch-img"
                          onError={e => { e.target.parentElement.style.background = "var(--s3)"; e.target.style.display = "none"; }}
                        />
                      </div>
                      <span className="color-nm">{c.name}</span>
                      {color?.id === c.id && <div className="chk-badge"><CheckIcon /></div>}
                    </button>
                  ))}
                </div>
              )
            }
          </Step>

          {/* STEP 3 */}
          <Step n={3} label="Select Festival / Campaign" done={!!festival}>
            <div className="pill-grid">
              {["Diwali", "Holi", "Dhanteras", "Independence Day", "Lohri", "IPL"].map(f => (
                <button
                  key={f}
                  className={`pill-btn${festival === f ? " pill-on" : ""}`}
                  onClick={() => setFestival(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            {festival && (
              <p className="hint" style={{marginTop: 8}}>
                Gemini will craft a scene brief → Imagen 4 generates a {festival} background
              </p>
            )}
          </Step>

          {/* STEP 4 */}
          <Step n={4} label="Select Language" done>
            <div className="pill-grid lang-pill-grid">
              {LANGUAGES.map(l => (
                <button
                  key={l}
                  className={`pill-btn${language === l ? " pill-on" : ""}`}
                  onClick={() => handleLanguageChange(l)}
                >
                  {l}
                </button>
              ))}
            </div>
          </Step>

          {/* STEP 5 */}
          <Step n={5} label="Select Offers" done={selectedOfferIds.length > 0 || customOfferText.trim() !== ""}>
            {/* Offer ribbons — predefined checklist */}
            <div className="offer-section-hd">
              <span>Offer Ribbons <span className="offer-count">{totalOfferSlots}/3</span></span>
            </div>

            <div className="offer-list">
              {OFFER_TYPES.map(ot => {
                const checked  = selectedOfferIds.includes(ot.id);
                const detail   = offerDetails[ot.id] || {};
                const disabled = !checked && totalOfferSlots >= 3;
                return (
                  <div key={ot.id} className={`offer-row${checked ? " offer-row-on" : ""}${disabled ? " offer-row-disabled" : ""}`}>
                    <label className="offer-check-label">
                      <input
                        type="checkbox"
                        className="offer-checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleOffer(ot.id)}
                      />
                      <span>{ot.label}</span>
                    </label>
                    {checked && ot.hasValue && (
                      <div className="offer-value-row">
                        <select
                          className="offer-type-sel"
                          value={detail.valueType || "UPTO"}
                          onChange={e => updateOfferDetail(ot.id, "valueType", e.target.value)}
                        >
                          {OFFER_VALUE_TYPES.map(vt => <option key={vt} value={vt}>{vt}</option>)}
                        </select>
                        <span className="offer-rupee">₹</span>
                        <input
                          type="text"
                          className="offer-value-inp"
                          placeholder="Amount"
                          value={detail.amount || ""}
                          onChange={e => updateOfferDetail(ot.id, "amount", e.target.value)}
                        />
                      </div>
                    )}
                    {checked && translatedOffers[ot.id] && (
                      <div className="translated-box" style={{marginTop:4}}>
                        <div className="translated-label">{language}:</div>
                        <div className="translated-text">{translatedOffers[ot.id]}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="custom-offer-section">
              <div className="custom-offer-label">OR ENTER CUSTOM OFFER TEXT</div>
              <textarea
                className="custom-ta"
                rows={2}
                placeholder="Type your own offer text..."
                value={customOfferText}
                disabled={!customOfferText.trim() && selectedOfferIds.length >= 3}
                onChange={e => {
                  setCustomOfferText(e.target.value);
                  setTranslatedOffers(prev => { const n = { ...prev }; delete n.custom; return n; });
                }}
              />
              {translatedOffers["custom"] && (
                <div className="translated-box" style={{marginTop:6}}>
                  <div className="translated-label">{language}:</div>
                  <div className="translated-text">{translatedOffers["custom"]}</div>
                </div>
              )}
            </div>

            {language !== "English" && (selectedOfferIds.length > 0 || customOfferText.trim()) && (
              <div className="translate-row" style={{marginTop: 10}}>
                <button
                  className="btn-translate"
                  onClick={translateAllOffers}
                  disabled={translatingOffers}
                >
                  {translatingOffers ? (
                    <><SpinnerIcon size={14} color="var(--acc)" /> Translating...</>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/>
                      </svg>
                      Translate All to {language}
                    </>
                  )}
                </button>
                {Object.keys(translatedOffers).length > 0 && (
                  <span className="translate-ok">✓ Translated</span>
                )}
              </div>
            )}
            {translateOffersError && (
              <div className="translate-error" style={{marginTop:6}}>⚠ {translateOffersError}</div>
            )}
          </Step>

          {/* STEP 6 */}
          <Step n={6} label="Choose Platform" done={!!platform}>
            <div className="plat-grid">
              {PLATFORMS.map(p => (
                <button key={p.name} className={`plat-card${platform?.name === p.name ? " sel" : ""}`} onClick={() => setPlatform(p)}>
                  <div className="plat-ratio">{p.ratio}</div>
                  <div className="plat-name">{p.name}</div>
                  <div className="plat-dim">{p.width}×{p.height}</div>
                  {platform?.name === p.name && <div className="chk-badge"><CheckIcon /></div>}
                </button>
              ))}
            </div>
          </Step>

          {/* STEP 7 */}
          <Step n={7} label="Dealer Address" done={dealerAddress.trim() !== ""}>
            <textarea
              className="custom-ta"
              rows={2}
              placeholder="Enter Dealer Address..."
              value={dealerAddress}
              onChange={e => setDealerAddress(e.target.value)}
            />
          </Step>

        </div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div className="right">
          <div className="right-sticky">

            {/* Summary */}
            <div className="summary">
              <div className="sum-title">SELECTION SUMMARY</div>
              {[
                { k: "Segment",  v: segment },
                { k: "Model",    v: model },
                { k: "Color",    v: color   ? color.name : null },
                { k: "Festival", v: festival },
                { k: "Language",   v: language },
                { k: "Offers",     v: finalOfferTexts.length > 0 ? finalOfferTexts.join(" · ") : null },
                { k: "Platform",   v: platform   ? `${platform.name} (${platform.ratio})` : null },
                { k: "Dealer Address", v: dealerAddress || null },
              ].map(({ k, v }) => (
                <div className="sum-row" key={k}>
                  <span className="sum-k">{k}</span>
                  <span className={`sum-v${!v ? " miss" : ""}`}>
                    {v || "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Generate */}
            <button className="btn-gen" onClick={handleGenerate} disabled={!canGenerate}>
              {generating ? <><SpinnerIcon /> GENERATING...</> : "GENERATE POSTER"}
            </button>
            {!canGenerate && !generating && (
              <p className="gen-hint">
                {!model ? "↑ Select a model" : !color ? "↑ Choose a color" : !festival ? "↑ Pick a festival / campaign" : "↑ Choose a platform"}
              </p>
            )}

            {/* Error */}
            {generateError && (
              <div className="gen-error">
                <div>⚠ {generateError}</div>
                {generateDetail && <div className="gen-error-detail">{generateDetail}</div>}
              </div>
            )}

            {/* Output */}
            {(generating || generated) && (
              <div className="output">
                {generating ? (
                  <div className="output-loading">
                    <SpinnerIcon />
                    <span>Generating AI background + compositing poster…</span>
                    <div className="load-bar"><div className="load-fill" /></div>
                    <p style={{fontSize:"11px",color:"var(--t2)",marginTop:6,textAlign:"center"}}>
                      Gemini → Imagen 4 → PIL compositor (30–60 s)
                    </p>
                  </div>
                ) : result && (
                  <div className="poster-wrap">
                    <img
                      src={`${API_BASE}${result.url}`}
                      alt="Generated poster"
                      className="poster-img"
                    />
                    <button className="btn-download" onClick={handleDownload}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Download Poster
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Edit offer text panel ─────────────────────────────── */}
            {generated && result && !generating && (
              <div className="edit-panel">
                <div className="edit-panel-hd">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  EDIT OFFER TEXT
                </div>

                {editOffers.map((txt, idx) => (
                  <div key={idx}>
                    <div className="edit-field-label" style={{marginTop: 10}}>
                      Offer {idx + 1} {editOffers.length > 1 ? `(${idx === 0 ? "left" : idx === 1 && editOffers.length === 2 ? "right" : idx === 1 ? "centre" : "right"})` : "(centre)"}
                    </div>
                    <textarea
                      className="custom-ta"
                      rows={2}
                      value={txt}
                      onChange={e => setEditOffers(p => p.map((o, i) => i === idx ? e.target.value : o))}
                      placeholder="Offer text for this banner"
                    />
                  </div>
                ))}

                <div className="edit-field-label" style={{marginTop: 10}}>Dealer Address</div>
                <textarea
                  className="custom-ta"
                  rows={2}
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  placeholder="Dealer address (footer)"
                />

                <button className="btn-apply" onClick={handleEdit} disabled={editing || !result?.base_filename}>
                  {editing ? (
                    <><SpinnerIcon size={16} color="white" /> Applying...</>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Apply Changes
                    </>
                  )}
                </button>

                {editError && <div className="edit-error">⚠ {editError}</div>}
                <div className="edit-note">Changes are saved to <code>outputs/edits/</code></div>
              </div>
            )}

          </div>
        </div>
        </div>
  );
}

function Header({ dark, setDark }) {
  return (
    <header className="hdr">
      <div className="hdr-left">
        <img src={heroLogo} alt="Hero MotoCorp" className="hdr-logo" />
        <div className="hdr-divider" />
        <div>
          <div className="hdr-title">HERO STUDIO</div>
          <div className="hdr-sub">Poster Generator · AI-Powered</div>
        </div>
      </div>
      <div className="hdr-right">
        <button className="theme-toggle" onClick={() => setDark(d => !d)} title={dark ? "Switch to Light" : "Switch to Dark"}>
          {dark ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
          {dark ? "Light" : "Dark"}
        </button>
        <span className="hdr-badge">v2.0 · BETA</span>
      </div>
    </header>
  );
}

function BrandGuidelines() {
  const [form, setForm] = useState(DEFAULT_GUIDELINES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadGuidelines = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/guidelines/`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Unable to load guidelines");
        if (!cancelled) setForm({ ...DEFAULT_GUIDELINES, ...data });
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load guidelines");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadGuidelines();
    return () => { cancelled = true; };
  }, []);

  const updateField = (field, value) => {
    setStatus("");
    setError("");
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/guidelines/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Unable to save guidelines");
      setForm({ ...DEFAULT_GUIDELINES, ...data });
      setStatus("Guidelines saved.");
    } catch (err) {
      setError(err.message || "Unable to save guidelines");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <section className="settings-panel">
        <div className="settings-head">
          <div>
            <div className="settings-kicker">BRAND CONTROL</div>
            <h1 className="settings-title">Brand Guidelines</h1>
          </div>
          <span className="settings-chip">Local JSON</span>
        </div>

        {loading ? (
          <div className="settings-loading"><SpinnerIcon size={16} color="var(--acc)" /> Loading guidelines...</div>
        ) : (
          <div className="settings-form">
            <label className="field">
              <span className="field-label">Brand Name</span>
              <input
                className="settings-input"
                value={form.brand_name}
                onChange={e => updateField("brand_name", e.target.value)}
                placeholder="Hero MotoCorp"
              />
            </label>

            <label className="field">
              <span className="field-label">Guidelines</span>
              <textarea
                className="settings-textarea"
                rows={8}
                value={form.guidelines}
                onChange={e => updateField("guidelines", e.target.value)}
                placeholder="Use official brand colors, keep motorcycles realistic, maintain premium dealer communication..."
              />
            </label>

            <label className="field">
              <span className="field-label">Negative Prompt</span>
              <textarea
                className="settings-textarea"
                rows={5}
                value={form.negative_prompt}
                onChange={e => updateField("negative_prompt", e.target.value)}
                placeholder="Avoid distorted logos, incorrect bike proportions, cluttered offers, off-brand colors..."
              />
            </label>

            <div className="apply-box">
              <div className="field-label">Apply guideline to</div>
              <div className="apply-options">
                <label className={`apply-option${form.apply_to_image ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={form.apply_to_image}
                    onChange={e => updateField("apply_to_image", e.target.checked)}
                  />
                  <span className="apply-check">{form.apply_to_image && <CheckIcon />}</span>
                  <span>Image Generation</span>
                </label>
                <label className={`apply-option${form.apply_to_video ? " on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={form.apply_to_video}
                    onChange={e => updateField("apply_to_video", e.target.checked)}
                  />
                  <span className="apply-check">{form.apply_to_video && <CheckIcon />}</span>
                  <span>Video Generation</span>
                </label>
              </div>
            </div>

            <div className="settings-actions">
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                {saving ? <><SpinnerIcon size={16} /> Saving...</> : "Save Guidelines"}
              </button>
              {status && <span className="save-status">{status}</span>}
              {error && <span className="save-error">{error}</span>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function VideoPlaceholder() {
  return (
    <div className="settings-page">
      <section className="settings-panel">
        <div className="settings-head">
          <div>
            <div className="settings-kicker">WORKSPACE</div>
            <h1 className="settings-title">Video</h1>
          </div>
          <span className="settings-chip muted">Inactive</span>
        </div>
      </section>
    </div>
  );
}

// ─── Main shell ───────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false);
  const [activeView, setActiveView] = useState("image");

  const renderView = () => {
    if (activeView === "brand") return <BrandGuidelines />;
    if (activeView === "video") return <VideoPlaceholder />;
    return <ImageGenerator />;
  };

  return (
    <div className={`app${dark ? "" : " light"}`}>
      <style>{CSS}</style>
      <div className="app-layout">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="main-content">
          <Header dark={dark} setDark={setDark} />
          {renderView()}
        </main>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:          #111111;
    --s1:          #1a1a1a;
    --s2:          #222222;
    --s3:          #2d2d2d;
    --border:      rgba(255,255,255,0.07);
    --acc:         #c0150f;
    --acc-dim:     rgba(192,21,15,0.14);
    --acc-glow:    rgba(192,21,15,0.30);
    --text:        #f0f0f0;
    --muted:       rgba(240,240,240,0.48);
    --dim:         rgba(240,240,240,0.22);
    --ok:          #22c55e;
    --r:           10px;
    --rs:          7px;
  }

  .app.light {
    --bg:          #f4f4f6;
    --s1:          #ffffff;
    --s2:          #f0f0f3;
    --s3:          #e4e4e8;
    --border:      rgba(0,0,0,0.09);
    --acc-dim:     rgba(192,21,15,0.08);
    --acc-glow:    rgba(192,21,15,0.22);
    --text:        #111111;
    --muted:       rgba(17,17,17,0.50);
    --dim:         rgba(17,17,17,0.28);
    --ok:          #16a34a;
  }

  html, body, #root { min-height: 100%; }
  body { margin: 0; font-family: 'DM Sans', sans-serif; background: var(--bg); }

  .app {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    transition: background .25s, color .25s;
  }

  .app-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    width: 100%;
  }

  .sidebar {
    flex: 0 0 224px;
    min-height: 100vh;
    padding: 18px 14px;
    background: linear-gradient(180deg, #151820 0%, #101217 100%);
    border-right: 1px solid rgba(255,255,255,0.08);
    box-shadow: inset -1px 0 0 rgba(0,0,0,0.32);
  }

  .sb-nav {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: sticky;
    top: 18px;
  }

  .sb-item {
    width: 100%;
    min-height: 40px;
    padding: 0 13px;
    border: 1px solid transparent;
    border-radius: var(--rs);
    background: transparent;
    color: rgba(255,255,255,0.62);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: .02em;
    text-align: left;
    cursor: pointer;
    transition: background .18s, border-color .18s, color .18s;
  }

  .sb-item:hover {
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.86);
  }

  .sb-item.active {
    background: rgba(192,21,15,0.18);
    border-color: rgba(192,21,15,0.52);
    color: #ffffff;
    box-shadow: inset 3px 0 0 var(--acc);
  }

  .main-content {
    flex: 1 1 auto;
    min-width: 0;
    padding: 0 24px 80px;
  }

  .main-content > .hdr,
  .main-content > .layout,
  .main-content > .settings-page {
    max-width: 1400px;
    margin-left: auto;
    margin-right: auto;
  }

  /* Header */
  .hdr {
    min-height: 56px;
    padding: 15px 0 13px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 18px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px;
  }
  .hdr-left { display: flex; align-items: center; gap: 11px; min-width: 0; }
  .hdr-logo { height: 28px; width: auto; object-fit: contain; flex-shrink: 0; display: block; }
  .hdr-divider { width: 1px; height: 22px; background: var(--border); flex-shrink: 0; }
  .hdr-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(15px, 1.9vw, 26px);
    line-height: .9; letter-spacing: .04em;
    background: linear-gradient(135deg, #c0150f 0%, #ff3d1f 55%, #c0150f 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .hdr-sub { font-size: 8px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-top: 3px; font-weight: 500; }
  .hdr-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .hdr-badge {
    font-size: 8px; font-weight: 600; letter-spacing: .06em;
    background: var(--acc-dim); border: 1px solid var(--acc-glow); color: var(--acc);
    padding: 3px 7px; border-radius: 12px;
  }
  .theme-toggle {
    display: flex; align-items: center; gap: 4px;
    padding: 4px 8px; border-radius: 12px;
    background: var(--s2); border: 1px solid var(--border);
    color: var(--muted); font-size: 9px; font-weight: 600;
    cursor: pointer; transition: all .18s; letter-spacing: .03em;
    font-family: 'DM Sans', sans-serif;
  }
  .theme-toggle svg { width: 7px; height: 7px; }
  .theme-toggle:hover { border-color: var(--acc-glow); color: var(--text); }

  /* Layout */
  .layout { display: grid; grid-template-columns: 1fr 375px; gap: 24px; align-items: start; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .right-sticky { position: static !important; } }
  @media (max-width: 760px) {
    .app-layout { flex-direction: column; }
    .sidebar {
      min-height: auto;
      flex: 0 0 auto;
      padding: 10px 12px;
      border-right: 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .sb-nav {
      position: static;
      flex-direction: row;
      overflow-x: auto;
      gap: 6px;
    }
    .sb-item {
      width: auto;
      min-width: max-content;
      min-height: 34px;
      padding: 0 12px;
    }
    .main-content { padding: 0 14px 56px; }
    .hdr { align-items: center; flex-wrap: wrap; }
  }

  /* Settings */
  .settings-page {
    padding-bottom: 48px;
  }
  .settings-panel {
    background: var(--s1);
    border: 1px solid var(--border);
    border-radius: var(--r);
    overflow: hidden;
  }
  .settings-head {
    padding: 20px 22px;
    background: var(--s2);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }
  .settings-kicker {
    font-size: 10px;
    line-height: 1;
    letter-spacing: .12em;
    color: var(--muted);
    font-weight: 700;
    margin-bottom: 8px;
  }
  .settings-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 30px;
    line-height: 1;
    font-weight: 400;
    letter-spacing: .04em;
    color: var(--text);
  }
  .settings-chip {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .07em;
    color: var(--acc);
    background: var(--acc-dim);
    border: 1px solid var(--acc-glow);
    border-radius: 999px;
    padding: 6px 10px;
    text-transform: uppercase;
  }
  .settings-chip.muted {
    color: var(--muted);
    background: var(--s3);
    border-color: var(--border);
  }
  .settings-loading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 22px;
    color: var(--muted);
    font-size: 13px;
  }
  .settings-form {
    padding: 22px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .field-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .settings-input,
  .settings-textarea {
    width: 100%;
    background: var(--s2);
    border: 1px solid var(--border);
    border-radius: var(--rs);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    line-height: 1.55;
    outline: none;
    transition: border-color .16s, box-shadow .16s, background .16s;
  }
  .settings-input {
    height: 42px;
    padding: 0 13px;
  }
  .settings-textarea {
    min-height: 120px;
    padding: 12px 13px;
    resize: vertical;
  }
  .settings-input::placeholder,
  .settings-textarea::placeholder {
    color: var(--dim);
  }
  .settings-input:focus,
  .settings-textarea:focus {
    border-color: var(--acc-glow);
    box-shadow: 0 0 0 3px var(--acc-dim);
  }
  .apply-box {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .apply-options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .apply-option {
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 13px;
    border-radius: var(--rs);
    border: 1px solid var(--border);
    background: var(--s2);
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: border-color .16s, background .16s, color .16s;
  }
  .apply-option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .apply-check {
    width: 18px;
    height: 18px;
    border-radius: 5px;
    border: 1px solid var(--border);
    background: var(--s3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    flex-shrink: 0;
  }
  .apply-option.on {
    border-color: var(--acc);
    background: var(--acc-dim);
    color: var(--text);
  }
  .apply-option.on .apply-check {
    border-color: var(--acc);
    background: var(--acc);
  }
  .settings-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding-top: 2px;
  }
  .btn-save {
    min-height: 42px;
    padding: 0 20px;
    border: 0;
    border-radius: var(--rs);
    background: linear-gradient(135deg, #c0150f, #e82318);
    color: white;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: .04em;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: transform .16s, box-shadow .16s, opacity .16s;
  }
  .btn-save:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(192,21,15,.32);
  }
  .btn-save:disabled {
    opacity: .58;
    cursor: not-allowed;
  }
  .save-status {
    font-size: 12px;
    color: var(--ok);
    font-weight: 700;
  }
  .save-error {
    font-size: 12px;
    color: #ef4444;
    font-weight: 700;
  }
  @media (max-width: 760px) {
    .settings-head {
      align-items: flex-start;
      flex-direction: column;
    }
    .settings-form {
      padding: 16px;
    }
    .apply-options {
      grid-template-columns: 1fr;
    }
  }

  .left { display: flex; flex-direction: column; gap: 10px; }
  .right { min-width: 0; }
  .right-sticky { position: sticky; top: 20px; display: flex; flex-direction: column; gap: 10px; }

  /* Step */
  .step { background: var(--s1); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; transition: border-color .2s; }
  .step-done { border-color: rgba(34,197,94,.12); }
  .step-hd {
    padding: 13px 18px; background: var(--s2); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  .step-num {
    width: 24px; height: 24px; border-radius: 50%;
    background: var(--s3); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-family: monospace; color: var(--muted); flex-shrink: 0;
  }
  .step-num.done { background: rgba(34,197,94,.15); border-color: rgba(34,197,94,.3); color: var(--ok); }
  .step-lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; color: var(--muted); flex: 1; }
  .step-done .step-lbl { color: var(--text); }
  .step-tick { font-size: 10px; color: var(--ok); }
  .step-bd { padding: 16px 18px; }

  /* Loading row */
  .loading-row {
    display: flex; align-items: center; gap: 8px;
    color: var(--muted); font-size: 13px; padding: 8px 0;
  }

  /* Segment tabs */
  .seg-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .tab {
    padding: 5px 14px; border-radius: 20px;
    background: var(--s2); border: 1px solid var(--border); color: var(--muted);
    font-size: 12px; font-weight: 600; letter-spacing: .04em; cursor: pointer; transition: all .15s;
  }
  .tab:hover { border-color: var(--acc-glow); color: var(--text); }
  .tab-on { background: var(--acc-dim); border-color: var(--acc); color: var(--acc); }

  /* Model grid */
  .model-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(108px, 1fr)); gap: 8px; }
  .model-card {
    position: relative; background: var(--s2); border: 1px solid var(--border);
    border-radius: var(--rs); cursor: pointer; padding: 0; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; text-align: center; transition: all .15s;
  }
  .model-card:hover { border-color: var(--acc-glow); transform: translateY(-1px); }
  .model-card.sel { border-color: var(--acc); box-shadow: 0 0 0 1px var(--acc-glow), inset 0 0 18px var(--acc-dim); }
  .model-thumb {
    width: 100%; aspect-ratio: 4/3; position: relative; overflow: hidden;
    background: radial-gradient(ellipse at center, var(--s1) 0%, var(--s3) 100%);
  }
  .thumb-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
  .model-nm { font-size: 10px; font-weight: 600; color: var(--muted); padding: 5px 6px 8px; line-height: 1.3; width: 100%; }
  .model-card.sel .model-nm { color: var(--text); }

  /* Offer list (checkbox system) */
  .offer-section-hd {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 16px; margin-bottom: 6px;
    font-size: 11px; color: var(--dim);
  }
  .offer-count { color: var(--acc); font-weight: 700; }
  .offer-list { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
  .offer-row {
    display: flex; flex-direction: column; gap: 5px;
    padding: 7px 10px; border-radius: var(--rs);
    border: 1px solid transparent; transition: all .15s;
  }
  .offer-row:hover { background: var(--s2); }
  .offer-row-on { background: var(--acc-dim); border-color: var(--acc-glow); }
  .offer-row-disabled { opacity: .4; pointer-events: none; }
  .offer-check-label {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; font-weight: 500; color: var(--text); cursor: pointer;
  }
  .offer-checkbox { width: 15px; height: 15px; accent-color: var(--acc); cursor: pointer; flex-shrink: 0; }
  .offer-value-row { display: flex; align-items: center; gap: 6px; padding-left: 23px; }
  .offer-type-sel {
    width: 90px; padding: 4px 8px; border-radius: 6px;
    background: var(--s1); border: 1px solid var(--border);
    color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 11px;
    cursor: pointer; outline: none;
  }
  .offer-rupee { font-size: 13px; color: var(--muted); }
  .offer-value-inp {
    flex: 1; padding: 4px 8px; border-radius: 6px;
    background: var(--s1); border: 1px solid var(--border);
    color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 12px;
    outline: none; min-width: 0;
  }
  .offer-value-inp:focus { border-color: var(--acc-glow); }
  .offer-value-inp::placeholder { color: var(--dim); }
  .custom-offer-section { margin-top: 4px; }
  .custom-offer-label {
    font-size: 10px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--dim); margin-bottom: 6px;
  }

  /* Color grid */
  .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 8px; }
  .color-card {
    position: relative; background: var(--s2); border: 1px solid var(--border);
    border-radius: var(--rs); cursor: pointer; padding: 0; overflow: hidden;
    display: flex; flex-direction: column; align-items: center; transition: all .15s;
  }
  .color-card:hover { border-color: var(--acc-glow); transform: translateY(-1px); }
  .color-card.sel { border-color: var(--acc); box-shadow: 0 0 0 1px var(--acc-glow); }
  .color-swatch { width: 100%; aspect-ratio: 4/3; position: relative; overflow: hidden; background: var(--s3); }
  .swatch-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .color-nm { font-size: 10px; font-weight: 600; color: var(--muted); padding: 5px 4px 7px; text-align: center; line-height: 1.3; width: 100%; }
  .color-card.sel .color-nm { color: var(--text); }

  /* Pill buttons (backgrounds, languages) */
  .pill-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .lang-pill-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .pill-btn {
    padding: 7px 16px; border-radius: 20px;
    background: var(--s2); border: 1px solid var(--border); color: var(--muted);
    font-size: 12px; font-weight: 600; letter-spacing: .03em; cursor: pointer;
    transition: all .15s; font-family: 'DM Sans', sans-serif; white-space: nowrap;
  }
  .pill-btn:hover { border-color: var(--acc-glow); color: var(--text); }
  .pill-on { background: var(--acc-dim) !important; border-color: var(--acc) !important; color: var(--acc) !important; }
  .lang-pill-grid .pill-btn { padding: 7px 6px; text-align: center; font-size: 11px; }

  /* Textarea */
  .custom-ta {
    width: 100%; padding: 10px 14px;
    background: var(--s2); border: 1px solid var(--border); border-radius: var(--rs);
    color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13px;
    resize: vertical; outline: none; line-height: 1.6;
  }
  .custom-ta::placeholder { color: var(--dim); }
  .custom-ta:focus { border-color: var(--acc-glow); }

  /* Translate UI */
  .translate-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
  .btn-translate {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 20px;
    background: var(--acc-dim); border: 1px solid var(--acc-glow);
    color: var(--acc); font-size: 12px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: all .15s; letter-spacing: .03em;
  }
  .btn-translate:hover:not(:disabled) { background: rgba(192,21,15,0.22); }
  .btn-translate:disabled { opacity: .5; cursor: not-allowed; }
  .translate-ok { font-size: 11px; color: var(--ok); font-weight: 600; }
  .translate-error { margin-top: 8px; font-size: 12px; color: #ef4444; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); padding: 8px 12px; border-radius: var(--rs); }
  .translated-box {
    margin-top: 10px; padding: 10px 12px;
    background: var(--s2); border: 1px solid var(--acc-glow);
    border-radius: var(--rs);
  }
  .translated-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: var(--acc); font-weight: 600; margin-bottom: 5px; }
  .translated-text { font-size: 14px; color: var(--text); line-height: 1.5; }

  /* Platform grid */
  .plat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .plat-card {
    position: relative; background: var(--s2); border: 1px solid var(--border);
    border-radius: var(--rs); cursor: pointer; padding: 14px 10px;
    display: flex; flex-direction: column; align-items: center; gap: 4px;
    transition: all .15s; text-align: center;
  }
  .plat-card:hover { border-color: var(--acc-glow); }
  .plat-card.sel { border-color: var(--acc); background: var(--acc-dim); }
  .plat-ratio { font-family: 'Bebas Neue', sans-serif; font-size: 26px; letter-spacing: .04em; color: var(--muted); line-height: 1; }
  .plat-card.sel .plat-ratio { color: var(--acc); }
  .plat-name { font-size: 12px; font-weight: 600; color: var(--text); letter-spacing: .04em; }
  .plat-dim { font-size: 10px; color: var(--dim); font-family: monospace; }

  /* Selected check badge (top-right on cards) */
  .chk-badge {
    position: absolute; top: 5px; right: 5px;
    width: 17px; height: 17px; border-radius: 50%;
    background: var(--acc); display: flex; align-items: center; justify-content: center;
    color: white; z-index: 2;
  }

  /* Summary */
  .summary { background: var(--s1); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }
  .sum-title {
    font-family: 'Bebas Neue', sans-serif; font-size: 15px; letter-spacing: .08em; color: var(--muted);
    margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border);
  }
  .sum-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 5px 0; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,.03);
  }
  .sum-row:last-child { border-bottom: none; }
  .sum-k { font-size: 10px; letter-spacing: .07em; text-transform: uppercase; font-weight: 500; color: var(--muted); }
  .sum-v { color: var(--text); font-weight: 600; display: flex; align-items: center; gap: 6px; max-width: 58%; text-align: right; word-break: break-word; }
  .sum-v.miss { color: var(--dim); font-weight: 400; font-style: italic; }

  /* Generate button */
  .btn-gen {
    width: 100%; padding: 15px;
    background: linear-gradient(135deg, #c0150f, #e82318);
    border: none; border-radius: var(--rs); color: white;
    font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: .1em;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
    transition: all .2s; position: relative; overflow: hidden;
  }
  .btn-gen::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg,rgba(255,255,255,.08),transparent); opacity: 0; transition: opacity .2s; }
  .btn-gen:hover:not(:disabled)::after { opacity: 1; }
  .btn-gen:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(192,21,15,.45); }
  .btn-gen:disabled { opacity: .32; cursor: not-allowed; }
  .gen-hint { text-align: center; font-size: 11px; color: var(--dim); margin-top: 2px; }

  /* Output */
  .output { background: var(--s1); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
  .output-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 40px 20px; gap: 12px; color: var(--muted); font-size: 13px;
  }
  .load-bar { width: 150px; height: 2px; background: var(--s3); border-radius: 2px; overflow: hidden; margin-top: 4px; }
  .load-fill { height: 100%; background: linear-gradient(90deg,#c0150f,#ff4d00); animation: lp 12s ease-out forwards; }
  @keyframes lp { 0%{width:0%} 80%{width:88%} 100%{width:100%} }

  /* Generated image */
  .poster-wrap { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .poster-img { width: 100%; border-radius: 6px; display: block; box-shadow: 0 4px 24px rgba(0,0,0,.5); }

  /* Download button */
  .btn-download {
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 11px;
    background: var(--s2); border: 1px solid var(--border); border-radius: var(--rs);
    color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .18s; letter-spacing: .03em;
    text-decoration: none; outline: none;
  }
  .btn-download:hover { border-color: var(--acc-glow); color: var(--acc); }

  /* Generate error */
  .gen-error {
    font-size: 12px; color: #ef4444;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
    padding: 10px 14px; border-radius: var(--rs);
  }
  .gen-error-detail {
    margin-top: 5px; font-size: 11px; color: rgba(239,68,68,0.75);
    font-family: monospace; word-break: break-word; white-space: pre-wrap;
  }

  /* Edit offer panel */
  .edit-panel {
    background: var(--s1); border: 1px solid var(--border); border-radius: var(--r);
    padding: 16px; display: flex; flex-direction: column; gap: 8px;
  }
  .edit-panel-hd {
    display: flex; align-items: center; gap: 8px;
    font-family: 'Bebas Neue', sans-serif; font-size: 15px; letter-spacing: .08em;
    color: var(--muted); padding-bottom: 10px; border-bottom: 1px solid var(--border);
    margin-bottom: 4px;
  }
  .edit-field-label {
    font-size: 11px; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: var(--muted);
  }
  .btn-apply {
    margin-top: 6px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%; padding: 12px;
    background: linear-gradient(135deg, #1a6b3a, #22a04e);
    border: none; border-radius: var(--rs);
    color: white; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
    letter-spacing: .04em; cursor: pointer; transition: all .18s;
  }
  .btn-apply:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(34,160,78,.35); }
  .btn-apply:disabled { opacity: .45; cursor: not-allowed; }
  .edit-error {
    font-size: 12px; color: #ef4444;
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
    padding: 8px 12px; border-radius: var(--rs);
  }
  .edit-note { font-size: 10px; color: var(--dim); text-align: center; margin-top: 2px; }

  /* Misc */
  code { font-family: monospace; font-size: 11px; color: var(--muted); }
  .hint { color: var(--dim); font-size: 12px; text-align: center; padding: 10px 0; font-style: italic; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin .85s linear infinite; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--s3); border-radius: 3px; }
`;
