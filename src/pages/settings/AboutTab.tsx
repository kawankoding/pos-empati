import { useEffect, useState } from "react";
import {
  BadgeCheck,
  BookOpen,
  Download,
  ExternalLink,
  Gavel,
  Globe,
  Mail,
  RefreshCw,
} from "lucide-react";
import Button from "@components/ui/Button";
import { api } from "@lib/api";
import logo from "/images/toko-empati.png";

/* ------------------------------------------------------------------ */
/*  AboutTab                                                          */
/* ------------------------------------------------------------------ */

export default function AboutTab() {
  const [appInfo, setAppInfo] = useState<{
    name: string;
    version: string;
    isPackaged: boolean;
    schemaVersion: number;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<
    "idle" | "checking" | "up-to-date" | "downloading" | "ready"
  >("idle");
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAppInfo()
      .then(setAppInfo)
      .catch(() => {});

    const unsubStatus = api.onUpdateStatus((status) => {
      if (status === "checking") setUpdateStatus("checking");
      if (status === "up-to-date") {
        setUpdateStatus("up-to-date");
        setTimeout(() => setUpdateStatus("idle"), 3000);
      }
    });
    const unsubAvailable = api.onUpdateAvailable((info) => {
      setUpdateVersion(info.version);
      setUpdateStatus("downloading");
    });
    const unsubProgress = api.onUpdateDownloadProgress((progress) => {
      setDownloadPercent(progress.percent);
    });
    const unsubDownloaded = api.onUpdateDownloaded((info) => {
      setUpdateVersion(info.version);
      setUpdateStatus("ready");
    });
    const unsubError = api.onUpdateError((msg) => {
      setUpdateError(msg);
      setUpdateStatus("idle");
      setTimeout(() => setUpdateError(null), 5000);
    });

    return () => {
      unsubStatus();
      unsubAvailable();
      unsubProgress();
      unsubDownloaded();
      unsubError();
    };
  }, []);

  const handleCheckUpdates = async () => {
    setUpdateStatus("checking");
    setUpdateError(null);
    await api.checkForUpdates();
  };

  const handleInstall = () => {
    void api.installUpdate();
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* App Information + System Status */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* App Information */}
        <section className="flex items-center gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl bg-emerald-50 p-4">
            <img
              className="h-full w-full object-contain"
              src={logo}
              alt="Toko Empati Logo"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-slate-800">
              {appInfo?.name ?? "POS Empati"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Offline-first Point of Sale system — fast, reliable, and designed for Indonesian
              retail.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-4 py-1.5 text-emerald-700">
              <BadgeCheck size={14} />
              <span className="text-xs font-semibold">
                {appInfo ? `v${appInfo.version}` : "..."}
              </span>
            </div>

            {/* Update controls */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {updateStatus === "ready" ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Download size={14} />}
                  onClick={handleInstall}
                >
                  Restart untuk Perbarui
                </Button>
              ) : updateStatus === "downloading" ? (
                <span className="text-xs text-slate-500">
                  Mengunduh {updateVersion} &mdash; {downloadPercent}%
                </span>
              ) : updateStatus === "checking" ? (
                <span className="text-xs text-slate-500">Memeriksa pembaruan...</span>
              ) : updateStatus === "up-to-date" ? (
                <span className="text-xs text-emerald-600">Aplikasi sudah versi terbaru.</span>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RefreshCw size={14} />}
                  onClick={handleCheckUpdates}
                >
                  Periksa Pembaruan
                </Button>
              )}
              {updateVersion && updateStatus !== "ready" && updateStatus !== "downloading" && (
                <span className="text-xs text-slate-400">v{updateVersion} tersedia</span>
              )}
            </div>
            {updateError ? <p className="mt-2 text-xs text-red-600">{updateError}</p> : null}
          </div>
        </section>

        {/* System Status */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-bold tracking-widest text-emerald-700 uppercase">
            System Status
          </h3>
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500">Environment</span>
              <span className="text-sm font-semibold text-slate-800">
                {appInfo ? (appInfo.isPackaged ? "Production" : "Development") : "..."}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500">Electron</span>
              <span className="text-sm font-semibold text-slate-800">
                {appInfo && window.navigator
                  ? (window.navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] ?? "...")
                  : "..."}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-500">Schema Version</span>
              <span className="text-sm font-semibold text-slate-800">
                {appInfo ? `v${appInfo.schemaVersion}` : "..."}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Status</span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Developer & Support */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Developer & Support</h3>
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <a
            href="#"
            className="group flex flex-col gap-2 rounded-xl border border-slate-200 p-5 transition-all hover:border-emerald-300 hover:bg-emerald-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
              <Globe size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-800">Official Website</span>
            <span className="text-xs text-slate-500">www.tokoempati.com</span>
          </a>

          <a
            href="#"
            className="group flex flex-col gap-2 rounded-xl border border-slate-200 p-5 transition-all hover:border-emerald-300 hover:bg-emerald-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
              <BookOpen size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-800">Documentation</span>
            <span className="text-xs text-slate-500">Read the user manual</span>
          </a>

          <a
            href="#"
            className="group flex flex-col gap-2 rounded-xl border border-slate-200 p-5 transition-all hover:border-emerald-300 hover:bg-emerald-50/50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
              <Mail size={20} />
            </div>
            <span className="text-sm font-semibold text-slate-800">Support Email</span>
            <span className="text-xs text-slate-500">support@tokoempati.com</span>
          </a>
        </div>
      </section>

      {/* Legal & Licensing */}
      <section className="flex flex-col items-center justify-between gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <Gavel size={28} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Legal & Licensing</h3>
            <p className="mt-1 text-sm text-slate-500">
              Licensed under <strong>Corporate Enterprise Agreement</strong>. Unauthorized
              distribution is prohibited.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm">
            Privacy Policy
          </Button>
          <Button variant="primary" size="sm" rightIcon={<ExternalLink size={14} />}>
            View Terms of Service
          </Button>
        </div>
      </section>

      {/* Footer */}
      <div className="flex flex-col items-center py-6 opacity-40">
        <p className="text-xs font-semibold text-slate-500">
          &copy; {new Date().getFullYear()} {appInfo?.name ?? "POS Empati"}. All rights reserved.
        </p>
        <p className="mt-1 text-xs text-slate-500 italic">
          Designed for speed. Engineered for reliability.
        </p>
      </div>
    </div>
  );
}
