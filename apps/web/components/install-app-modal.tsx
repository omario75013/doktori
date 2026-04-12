"use client";

import { useState, useEffect } from "react";
import { X, Share, Plus, Download } from "lucide-react";
import { AppleIcon, GooglePlayIcon } from "./store-badges";

type Props = { open: boolean; onClose: () => void };

export function InstallAppModal({ open, onClose }: Props) {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) setPlatform("ios");
    else if (/android/.test(ua)) setPlatform("android");
    else setPlatform("desktop");
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-slate-100"
          aria-label="Fermer"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0891B2] shadow-lg mb-4">
            {platform === "ios" ? (
              <AppleIcon className="h-8 w-8 text-white" />
            ) : platform === "android" ? (
              <GooglePlayIcon className="h-8 w-8" />
            ) : (
              <AppleIcon className="h-8 w-8 text-white" />
            )}
          </div>

          <h2 className="text-xl font-bold text-[#134E4A]">
            Installer Doktori
          </h2>

          {platform === "ios" && (
            <div className="mt-4 space-y-4 text-left w-full">
              <p className="text-sm text-[#5E7574] text-center">
                Ajoutez Doktori sur votre écran d&apos;accueil en 3 étapes :
              </p>
              <div className="space-y-3">
                <Step
                  n={1}
                  icon={<Share className="h-4 w-4 text-[#0891B2]" />}
                  text={<>Appuyez sur le bouton <strong>Partager</strong> <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100"><Share className="h-3 w-3 text-[#0891B2]" /></span> en bas de Safari</>}
                />
                <Step
                  n={2}
                  icon={<Plus className="h-4 w-4 text-[#0891B2]" />}
                  text={<>Faites défiler et appuyez sur <strong>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong> <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100"><Plus className="h-3 w-3 text-[#0891B2]" /></span></>}
                />
                <Step
                  n={3}
                  icon={null}
                  text={<>Appuyez sur <strong>&quot;Ajouter&quot;</strong> en haut à droite</>}
                />
              </div>
              <p className="text-xs text-[#5E7574] text-center mt-4">
                L&apos;application sera installée comme une app native sur votre iPhone.
              </p>
            </div>
          )}

          {platform === "android" && (
            <div className="mt-4 space-y-4 text-left w-full">
              <p className="text-sm text-[#5E7574] text-center">
                Installez Doktori directement depuis votre navigateur :
              </p>
              <div className="space-y-3">
                <Step
                  n={1}
                  icon={null}
                  text={<>Appuyez sur le menu <strong>⋮</strong> en haut à droite de Chrome</>}
                />
                <Step
                  n={2}
                  icon={<Download className="h-4 w-4 text-[#0891B2]" />}
                  text={<>Appuyez sur <strong>&quot;Installer l&apos;application&quot;</strong> ou <strong>&quot;Ajouter à l&apos;écran d&apos;accueil&quot;</strong></>}
                />
                <Step
                  n={3}
                  icon={null}
                  text={<>Confirmez avec <strong>&quot;Installer&quot;</strong></>}
                />
              </div>
              <p className="text-xs text-[#5E7574] text-center mt-4">
                L&apos;application s&apos;installe comme une app native sur votre Android.
              </p>
            </div>
          )}

          {platform === "desktop" && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[#5E7574]">
                Ouvrez <strong>doktori.tn</strong> sur votre téléphone pour installer l&apos;application.
              </p>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-slate-100">
                    <AppleIcon className="h-7 w-7 text-black" />
                  </div>
                  <p className="text-xs font-medium text-[#134E4A] mt-2">iPhone / iPad</p>
                  <p className="text-[10px] text-[#5E7574]">via Safari</p>
                </div>
                <div className="text-center">
                  <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-slate-100">
                    <GooglePlayIcon className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-medium text-[#134E4A] mt-2">Android</p>
                  <p className="text-[10px] text-[#5E7574]">via Chrome</p>
                </div>
              </div>
              <div className="rounded-xl bg-[#F0FDFA] p-3 text-center">
                <p className="text-xs text-[#0891B2] font-semibold">doktori.tn</p>
                <p className="text-[10px] text-[#5E7574] mt-0.5">Ouvrez ce lien sur votre mobile</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ n, icon, text }: { n: number; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#F0FDFA] p-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0891B2] text-xs font-bold text-white">
        {n}
      </div>
      <p className="text-sm text-[#134E4A] leading-relaxed">{text}</p>
    </div>
  );
}
