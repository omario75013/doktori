import { readFileSync, writeFileSync } from "fs";

const fr = JSON.parse(readFileSync("i18n/messages/fr.json", "utf8"));
const ar = JSON.parse(readFileSync("i18n/messages/ar.json", "utf8"));

// ── 1. Settings missing keys ──────────────────────────────────────────────────
Object.assign(fr.medecin.settings, {
  sectionNotifChannels: "Canaux de notification",
  notifChannelsDesc: "Choisissez comment vous souhaitez être notifié des nouveaux rendez-vous.",
  sectionRemindersActivation: "Activation des rappels",
  toggleSendReminders: "Envoyer des rappels automatiques aux patients",
  sectionWhenToSendReminder: "Quand envoyer le rappel ?",
  whenToSendReminderDesc: "Sélectionnez les délais avant le rendez-vous auxquels le patient recevra un rappel.",
  sectionCancelChannels: "Canaux d'alerte d'annulation",
  cancelChannelsDesc: "Choisissez comment notifier le patient lorsqu'un rendez-vous est annulé.",
  sectionWhenToNotifyPatient: "Délais d'alerte après annulation",
  whenToNotifyPatientDesc: "À quel moment après l'annulation le patient doit-il être notifié ?",
  sectionMessageTemplate: "Message personnalisé d'annulation",
  sectionPassword: "Mot de passe",
  labelCurrentPassword: "Mot de passe actuel",
  labelNewPassword: "Nouveau mot de passe",
  labelConfirmPassword: "Confirmer le mot de passe",
  section2FA: "Double authentification (2FA)",
  twoFAActiveMessage: "La double authentification est activée sur votre compte.",
  disableTFAPrompt: "Saisissez votre mot de passe pour désactiver la 2FA.",
  disable2FAButton: "Désactiver la 2FA",
  enable2FAButton: "Activer la 2FA",
  twoFASetupStep1: "Scannez ce QR code avec votre application (Google Authenticator, Authy…)",
  twoFAManualEntry: "Ou entrez ce code manuellement :",
  twoFASetupStep2: "Entrez le code à 6 chiffres affiché par votre application",
  validateAndActivate: "Valider et activer",
  activeOffsets: "Actifs :",
  noOffsetSelected: "Aucun délai sélectionné",
  savedCodesButton: "Codes sauvegardés",
  aboutDescription: "Doktori est la plateforme médicale de référence en Tunisie. Prise de rendez-vous en ligne, téléconsultation, gestion de cabinet et espace patient sécurisé.",
  aboutDeveloperLabel: "Développeur",
  aboutPlatformLabel: "Plateforme",
  aboutRightsLabel: "Droits",
  aboutRightsValue: "© 2025 Doktori. Tous droits réservés.",
  aboutLicenceLabel: "Licence",
  aboutLicenceValue: "Propriétaire",
});

Object.assign(ar.medecin.settings, {
  sectionNotifChannels: "قنوات الإشعارات",
  notifChannelsDesc: "اختر كيف تريد أن تُشعَر بالمواعيد الجديدة.",
  sectionRemindersActivation: "تفعيل التذكيرات",
  toggleSendReminders: "إرسال تذكيرات تلقائية للمرضى",
  sectionWhenToSendReminder: "متى يُرسَل التذكير؟",
  whenToSendReminderDesc: "حدّد المهل قبل الموعد التي سيتلقى فيها المريض تذكيراً.",
  sectionCancelChannels: "قنوات إشعارات الإلغاء",
  cancelChannelsDesc: "اختر كيف يُبلَّغ المريض عند إلغاء موعده.",
  sectionWhenToNotifyPatient: "مهل الإشعار بعد الإلغاء",
  whenToNotifyPatientDesc: "متى يجب إشعار المريض بعد الإلغاء؟",
  sectionMessageTemplate: "رسالة الإلغاء المخصصة",
  sectionPassword: "كلمة المرور",
  labelCurrentPassword: "كلمة المرور الحالية",
  labelNewPassword: "كلمة المرور الجديدة",
  labelConfirmPassword: "تأكيد كلمة المرور",
  section2FA: "المصادقة الثنائية (2FA)",
  twoFAActiveMessage: "المصادقة الثنائية مفعّلة على حسابك.",
  disableTFAPrompt: "أدخل كلمة مرورك لتعطيل المصادقة الثنائية.",
  disable2FAButton: "تعطيل المصادقة الثنائية",
  enable2FAButton: "تفعيل المصادقة الثنائية",
  twoFASetupStep1: "امسح رمز QR هذا بتطبيق المصادقة (Google Authenticator، Authy…)",
  twoFAManualEntry: "أو أدخل هذا الرمز يدوياً:",
  twoFASetupStep2: "أدخل الرمز المكوّن من 6 أرقام الظاهر في تطبيقك",
  validateAndActivate: "التحقق والتفعيل",
  activeOffsets: "النشطة:",
  noOffsetSelected: "لم يُحدَّد أي مهل",
  savedCodesButton: "تم حفظ الرموز",
  aboutDescription: "دكتوري هي المنصة الطبية المرجعية في تونس. حجز المواعيد أونلاين، الاستشارة عن بُعد، إدارة العيادة وفضاء المريض الآمن.",
  aboutDeveloperLabel: "المطوّر",
  aboutPlatformLabel: "المنصة",
  aboutRightsLabel: "الحقوق",
  aboutRightsValue: "© 2025 Doktori. جميع الحقوق محفوظة.",
  aboutLicenceLabel: "الترخيص",
  aboutLicenceValue: "ملكية خاصة",
});

// ── 2. Quick-actions namespace ────────────────────────────────────────────────
fr.medecin.quickActions = {
  sectionTitle: "Actions rapides (cloche)",
  sectionDesc: "Messages pré-définis à envoyer à la secrétaire en un clic via la cloche flottante.",
  noActions: "Aucune action configurée.",
  added: "Action rapide ajoutée",
  errorToast: "Erreur",
  deleteTitle: "Supprimer",
  labelPlaceholder: "Libellé (ex: Apporter un café)",
  messagePlaceholder: "Message (facultatif)",
  addButton: "Ajouter",
  quickActionsLabel: "Actions rapides",
};

ar.medecin.quickActions = {
  sectionTitle: "إجراءات سريعة (الجرس)",
  sectionDesc: "رسائل محددة مسبقاً لإرسالها إلى السكرتيرة بنقرة واحدة عبر أيقونة الجرس.",
  noActions: "لا إجراءات مُعدَّة.",
  added: "تمت إضافة الإجراء السريع",
  errorToast: "خطأ",
  deleteTitle: "حذف",
  labelPlaceholder: "الوصف (مثال: إحضار قهوة)",
  messagePlaceholder: "الرسالة (اختياري)",
  addButton: "إضافة",
  quickActionsLabel: "إجراءات سريعة",
};

// ── 3. Abonnement — new billing detail keys ───────────────────────────────────
Object.assign(fr.medecin.abonnement, {
  daysLeft: "{count} jours restants",
  trialExpiresOn: "Votre essai expire le {date}",
  trialChoosePlan: "Choisissez un plan pour continuer sans interruption.",
  annualDiscountCalc: "Soit {price} DT/an avec -15% annuel",
  billingMonthly: "Facturation mensuelle",
  billingMonthlyDesc: "votre abonnement se renouvelle automatiquement chaque mois.",
  billingCancel: "Annulable à tout moment",
  billingCancelDesc: "sans frais ni engagement. L'accès reste actif jusqu'à la fin de la période payée.",
  billingTrial: "Essai gratuit de 2 mois",
  billingTrialDesc: "tous les nouveaux médecins bénéficient de 2 mois d'essai avec accès à toutes les fonctionnalités.",
  billingCommissions: "Commissions sur consultations",
  billingCommissionsDesc: "le patient paie les téléconsultations (15% de commission Doktori) et interventions SOS (10% de commission). Le reste est crédité sur votre portefeuille Doktori et reversé mensuellement.",
  securePaymentDesc: "via Flouci ou Paymee — vos données bancaires ne sont jamais stockées sur nos serveurs.",
  promoErrorFallback: "Erreur lors de l'application du code promo.",
  checkoutErrorRetry: "Erreur lors du checkout. Veuillez réessayer.",
  closeBtnLabel: "Fermer",
});

Object.assign(ar.medecin.abonnement, {
  daysLeft: "{count} أيام متبقية",
  trialExpiresOn: "تنتهي تجربتك في {date}",
  trialChoosePlan: "اختر خطة للاستمرار دون انقطاع.",
  annualDiscountCalc: "أي {price} دت/سنة مع خصم 15% سنوياً",
  billingMonthly: "فوترة شهرية",
  billingMonthlyDesc: "يتجدد اشتراكك تلقائياً كل شهر.",
  billingCancel: "قابل للإلغاء في أي وقت",
  billingCancelDesc: "بدون رسوم أو التزامات. يظل الوصول نشطاً حتى نهاية الفترة المدفوعة.",
  billingTrial: "تجربة مجانية لمدة شهرين",
  billingTrialDesc: "يستفيد جميع الأطباء الجدد من شهرين تجريبيين مع الوصول الكامل لجميع المميزات.",
  billingCommissions: "عمولات الاستشارات",
  billingCommissionsDesc: "يدفع المريض تكلفة الاستشارات عن بُعد (عمولة 15% لدكتوري) وتدخلات SOS (عمولة 10%). يُضاف الباقي إلى محفظتك على دكتوري ويُحوَّل شهرياً.",
  securePaymentDesc: "عبر Flouci أو Paymee — لن تُخزَّن بياناتك المصرفية على خوادمنا أبداً.",
  promoErrorFallback: "خطأ أثناء تطبيق الرمز الترويجي.",
  checkoutErrorRetry: "خطأ أثناء الدفع. يرجى المحاولة مجدداً.",
  closeBtnLabel: "إغلاق",
});

writeFileSync("i18n/messages/fr.json", JSON.stringify(fr, null, 2) + "\n");
writeFileSync("i18n/messages/ar.json", JSON.stringify(ar, null, 2) + "\n");
console.log("Done. All keys added.");
