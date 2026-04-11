/**
 * FAQ content source of truth.
 *
 * Organized by category. Each entry is FR + AR; the active locale picks one.
 * Used both for the interactive client UI and for the FAQPage JSON-LD on the
 * server-rendered page (richer SEO / Google "People also ask" eligibility).
 */

export const FAQ_CATEGORIES = [
  { id: "booking", fr: "Prise de rendez-vous", ar: "حجز موعد", color: "#0891B2" },
  { id: "doctors", fr: "Médecins", ar: "الأطباء", color: "#22C55E" },
  { id: "payment", fr: "Paiement & tarifs", ar: "الدفع والأسعار", color: "#F59E0B" },
  { id: "account", fr: "Compte & données", ar: "الحساب والبيانات", color: "#8B5CF6" },
  { id: "sos", fr: "SOS Docteur", ar: "استغاثة طبيب", color: "#DC2626" },
  { id: "technical", fr: "Application", ar: "التطبيق", color: "#0E7490" },
  { id: "doctor-pro", fr: "Espace médecin", ar: "فضاء الطبيب", color: "#14B8A6" },
] as const;

export type FaqCategoryId = (typeof FAQ_CATEGORIES)[number]["id"];

export interface FaqItem {
  id: string;
  category: FaqCategoryId;
  question: { fr: string; ar: string };
  answer: { fr: string; ar: string };
}

export const FAQ_ITEMS: FaqItem[] = [
  // ─── Prise de rendez-vous ────────────────────────────────────────
  {
    id: "how-to-book",
    category: "booking",
    question: {
      fr: "Comment prendre rendez-vous en ligne sur Doktori ?",
      ar: "كيف أحجز موعدًا عبر الإنترنت على دكتوري؟",
    },
    answer: {
      fr: "Cherchez votre médecin par nom, spécialité ou quartier, sélectionnez un créneau disponible en temps réel, puis renseignez votre nom et votre numéro de téléphone. Vous recevez une confirmation SMS immédiate. Aucune création de compte obligatoire, le processus prend moins de 60 secondes.",
      ar: "ابحث عن طبيبك بالاسم أو الاختصاص أو الحي، واختر موعدًا متاحًا في الوقت الفعلي، ثم أدخل اسمك ورقم هاتفك. ستصلك رسالة تأكيد فورية. لا حاجة لإنشاء حساب، تستغرق العملية أقل من 60 ثانية.",
    },
  },
  {
    id: "book-without-account",
    category: "booking",
    question: {
      fr: "Puis-je réserver sans créer de compte ?",
      ar: "هل يمكنني الحجز دون إنشاء حساب؟",
    },
    answer: {
      fr: "Oui. Doktori a été conçu pour une prise de rendez-vous ultra-rapide : nom, téléphone, c'est tout. Si vous souhaitez retrouver votre historique ou gérer plusieurs rendez-vous, vous pouvez ensuite créer un compte gratuit depuis la page « Mes rendez-vous ».",
      ar: "نعم. تم تصميم دكتوري لحجز المواعيد بسرعة فائقة: الاسم ورقم الهاتف فقط. إذا كنت ترغب في استرجاع سجل مواعيدك أو إدارة عدة مواعيد، يمكنك لاحقًا إنشاء حساب مجاني من صفحة « مواعيدي ».",
    },
  },
  {
    id: "cancel-reschedule",
    category: "booking",
    question: {
      fr: "Comment annuler ou modifier un rendez-vous ?",
      ar: "كيف ألغي موعدًا أو أعدّله؟",
    },
    answer: {
      fr: "Le SMS de confirmation contient un lien direct vers votre rendez-vous. Cliquez dessus pour annuler ou replanifier en un clic, jusqu'à 2 heures avant l'heure prévue. Au-delà, contactez directement le cabinet du médecin.",
      ar: "تحتوي رسالة التأكيد على رابط مباشر إلى موعدك. اضغط عليه للإلغاء أو إعادة الجدولة بنقرة واحدة، حتى ساعتين قبل الموعد. بعد ذلك، يرجى الاتصال بعيادة الطبيب مباشرة.",
    },
  },
  {
    id: "advance-booking",
    category: "booking",
    question: {
      fr: "Combien de temps à l'avance puis-je réserver ?",
      ar: "كم من الوقت مسبقًا يمكنني الحجز؟",
    },
    answer: {
      fr: "Chaque médecin ouvre ses créneaux jusqu'à 8 semaines à l'avance. Pour les consultations du jour, les créneaux libérés par des annulations apparaissent en temps réel — pensez à rafraîchir la page si vous cherchez un créneau urgent.",
      ar: "يفتح كل طبيب مواعيده حتى 8 أسابيع مسبقًا. بالنسبة لاستشارات اليوم، تظهر المواعيد التي يتم تحريرها بسبب الإلغاءات في الوقت الفعلي — حدّث الصفحة إذا كنت تبحث عن موعد عاجل.",
    },
  },
  {
    id: "no-slots",
    category: "booking",
    question: {
      fr: "Que faire si aucun créneau n'est disponible ?",
      ar: "ماذا أفعل إذا لم تكن هناك مواعيد متاحة؟",
    },
    answer: {
      fr: "Trois options : (1) activez la liste d'attente et vous serez notifié par SMS dès qu'un créneau se libère, (2) élargissez votre recherche aux quartiers voisins via le filtre de proximité, ou (3) utilisez SOS Docteur pour une consultation urgente non-vitale.",
      ar: "ثلاثة خيارات: (1) فعّل قائمة الانتظار وسيتم إشعارك عبر SMS عند توفر موعد، (2) وسّع بحثك إلى الأحياء المجاورة عبر فلتر القرب، أو (3) استخدم استغاثة طبيب لاستشارة عاجلة غير حيوية.",
    },
  },
  {
    id: "book-for-other",
    category: "booking",
    question: {
      fr: "Puis-je réserver pour un proche (enfant, parent âgé) ?",
      ar: "هل يمكنني الحجز لأحد الأقارب (طفل، والد مسن)؟",
    },
    answer: {
      fr: "Oui. Indiquez simplement le nom du patient dans le formulaire et votre numéro de téléphone pour recevoir les rappels. Les pédiatres figurent dans la spécialité « Pédiatre » et acceptent tous les enfants de 0 à 18 ans.",
      ar: "نعم. فقط أدخل اسم المريض في النموذج ورقم هاتفك لاستلام التذكيرات. يظهر أطباء الأطفال في اختصاص « طبيب أطفال » ويقبلون جميع الأطفال من 0 إلى 18 سنة.",
    },
  },

  // ─── Médecins ───────────────────────────────────────────────────
  {
    id: "doctors-verified",
    category: "doctors",
    question: {
      fr: "Comment les médecins sont-ils vérifiés ?",
      ar: "كيف يتم التحقق من الأطباء؟",
    },
    answer: {
      fr: "Chaque médecin doit fournir son numéro d'inscription au Conseil de l'Ordre des Médecins de Tunisie (CNOM) ou au Conseil de l'Ordre des Médecins Dentistes (COMDT). Notre équipe vérifie manuellement chaque inscription sous 24h. Seuls les profils validés apparaissent dans les résultats de recherche — un badge vert certifie cette vérification.",
      ar: "يجب على كل طبيب تقديم رقم تسجيله في المجلس الوطني لهيئة الأطباء في تونس أو هيئة أطباء الأسنان. يتحقق فريقنا يدويًا من كل تسجيل خلال 24 ساعة. تظهر فقط الملفات المعتمدة في نتائج البحث — وتوثّق شارة خضراء هذا التحقق.",
    },
  },
  {
    id: "appointment-types",
    category: "doctors",
    question: {
      fr: "Puis-je choisir un motif de consultation spécifique ?",
      ar: "هل يمكنني اختيار سبب استشارة محدد؟",
    },
    answer: {
      fr: "Oui. Si le médecin a configuré ses motifs (première consultation, suivi, bilan, certificat médical, vaccination, etc.), vous les sélectionnez en début de réservation. La durée du créneau et le tarif s'adaptent automatiquement à votre choix.",
      ar: "نعم. إذا كان الطبيب قد أعدّ أسباب استشاراته (استشارة أولى، متابعة، فحص، شهادة طبية، تطعيم...)، يمكنك اختيارها في بداية الحجز. يتم تعديل مدة الموعد والسعر تلقائيًا حسب اختيارك.",
    },
  },
  {
    id: "doctor-languages",
    category: "doctors",
    question: {
      fr: "Les médecins parlent-ils arabe, français, anglais ?",
      ar: "هل يتحدث الأطباء بالعربية والفرنسية والإنجليزية؟",
    },
    answer: {
      fr: "La quasi-totalité des médecins tunisiens consultent en arabe tunisien et en français. De nombreux spécialistes parlent également anglais. Chaque profil de médecin indique les langues pratiquées — utilisez le filtre « Langues » pour affiner votre recherche.",
      ar: "يستشير معظم الأطباء التونسيين بالعربية التونسية والفرنسية. يتحدث كثير من المختصين الإنجليزية أيضًا. يوضح كل ملف طبيب اللغات التي يتحدثها — استخدم فلتر « اللغات » لتحسين بحثك.",
    },
  },
  {
    id: "cnam-convention",
    category: "doctors",
    question: {
      fr: "Les médecins acceptent-ils la CNAM ?",
      ar: "هل يقبل الأطباء بطاقة الصندوق الوطني للتأمين على المرض (CNAM)؟",
    },
    answer: {
      fr: "Oui, la majorité des médecins sur Doktori sont conventionnés CNAM. Sur la fiche du médecin, la section « Conventions » liste les organismes acceptés (CNAM, CNRPS, STAR, GAT, Maghrebia, COMAR…). Vous pouvez filtrer la recherche pour n'afficher que les médecins conventionnés avec votre mutuelle.",
      ar: "نعم، معظم الأطباء على دكتوري معتمدون لدى CNAM. في ملف الطبيب، يسرد قسم « الاتفاقيات » الجهات المقبولة (CNAM، CNRPS، STAR، GAT، Maghrebia، COMAR…). يمكنك تصفية البحث لعرض الأطباء المعتمدين لدى تأمينك فقط.",
    },
  },

  // ─── Paiement ──────────────────────────────────────────────────
  {
    id: "pay-upfront",
    category: "payment",
    question: {
      fr: "Dois-je payer à l'avance ma consultation ?",
      ar: "هل يجب أن أدفع ثمن الاستشارة مسبقًا؟",
    },
    answer: {
      fr: "Non, le paiement en avance est toujours optionnel. À la fin de la réservation, vous pouvez choisir de payer en ligne pour garantir votre place (utile pour les cabinets très demandés) ou payer directement au cabinet le jour du rendez-vous.",
      ar: "لا، الدفع المسبق اختياري دائمًا. في نهاية الحجز، يمكنك اختيار الدفع عبر الإنترنت لضمان موعدك (مفيد للعيادات المطلوبة) أو الدفع مباشرة في العيادة يوم الموعد.",
    },
  },
  {
    id: "payment-methods",
    category: "payment",
    question: {
      fr: "Quels moyens de paiement acceptez-vous ?",
      ar: "ما هي وسائل الدفع المقبولة؟",
    },
    answer: {
      fr: "Carte bancaire tunisienne ou internationale (Visa, Mastercard) via nos partenaires sécurisés Flouci et Paymee. En cabinet : espèces, carte, ou tiers-payant CNAM selon les conventions du médecin.",
      ar: "بطاقة بنكية تونسية أو دولية (Visa، Mastercard) عبر شركاء الدفع الآمن Flouci و Paymee. في العيادة: نقدًا، أو بطاقة، أو دفع من طرف ثالث CNAM حسب اتفاقيات الطبيب.",
    },
  },
  {
    id: "payment-secure",
    category: "payment",
    question: {
      fr: "Le paiement en ligne est-il sécurisé ?",
      ar: "هل الدفع عبر الإنترنت آمن؟",
    },
    answer: {
      fr: "Oui. Doktori ne stocke jamais vos données de carte bancaire. Tous les paiements sont traités par nos partenaires agréés par la Banque Centrale de Tunisie (Flouci, Paymee) via une connexion chiffrée 3D Secure. Vous recevez un reçu par SMS après chaque transaction.",
      ar: "نعم. لا يخزن دكتوري أبدًا بيانات بطاقتك البنكية. تتم معالجة جميع المدفوعات عبر شركائنا المعتمدين من البنك المركزي التونسي (Flouci، Paymee) باتصال مشفر 3D Secure. ستستلم إيصالًا عبر SMS بعد كل معاملة.",
    },
  },
  {
    id: "invoice",
    category: "payment",
    question: {
      fr: "Puis-je obtenir une facture pour ma consultation ?",
      ar: "هل يمكنني الحصول على فاتورة للاستشارة؟",
    },
    answer: {
      fr: "Oui. Chaque médecin peut émettre une facture directement depuis son espace. Demandez-la à la fin de la consultation, elle sera générée en PDF et envoyée sur votre numéro WhatsApp ou email.",
      ar: "نعم. يمكن لكل طبيب إصدار فاتورة مباشرة من فضائه. اطلبها في نهاية الاستشارة، وسيتم إنشاؤها بصيغة PDF وإرسالها إلى رقم WhatsApp أو البريد الإلكتروني.",
    },
  },

  // ─── Compte & données ─────────────────────────────────────────
  {
    id: "free-for-patients",
    category: "account",
    question: {
      fr: "Doktori est-il vraiment gratuit pour les patients ?",
      ar: "هل دكتوري مجاني فعلاً للمرضى؟",
    },
    answer: {
      fr: "Oui, 100% gratuit, pour toujours. Aucun abonnement, aucune commission sur le prix de la consultation, aucun frais caché. Notre modèle économique repose uniquement sur un abonnement mensuel payé par les médecins.",
      ar: "نعم، مجاني 100٪، إلى الأبد. لا اشتراكات، لا عمولات على سعر الاستشارة، لا رسوم خفية. يعتمد نموذجنا الاقتصادي حصريًا على اشتراك شهري يدفعه الأطباء.",
    },
  },
  {
    id: "data-protection",
    category: "account",
    question: {
      fr: "Mes données personnelles et médicales sont-elles protégées ?",
      ar: "هل بياناتي الشخصية والطبية محمية؟",
    },
    answer: {
      fr: "Doktori applique la loi organique n°2004-63 sur la protection des données en Tunisie ainsi que les standards RGPD européens. Nous stockons uniquement les informations strictement nécessaires à la prise de rendez-vous (nom, téléphone, historique). Nous ne stockons jamais de diagnostics, ordonnances ou résultats d'examens. Consultez notre politique de confidentialité pour le détail complet.",
      ar: "يطبق دكتوري القانون الأساسي رقم 2004-63 المتعلق بحماية البيانات في تونس إلى جانب معايير RGPD الأوروبية. نخزن فقط المعلومات الضرورية لحجز المواعيد (الاسم، الهاتف، السجل). لا نخزن أبدًا التشخيصات أو الوصفات أو نتائج الفحوصات. راجع سياسة الخصوصية لمزيد من التفاصيل.",
    },
  },
  {
    id: "delete-account",
    category: "account",
    question: {
      fr: "Comment supprimer mon compte et mes données ?",
      ar: "كيف أحذف حسابي وبياناتي؟",
    },
    answer: {
      fr: "Depuis votre espace patient, cliquez sur « Paramètres » puis « Supprimer mon compte ». La suppression est définitive et prend effet sous 48h — toutes vos données personnelles seront effacées, à l'exception des informations légalement conservées (historique de paiement sur 10 ans, imposé par la loi comptable tunisienne).",
      ar: "من فضائك كمريض، انقر على « الإعدادات » ثم « حذف حسابي ». الحذف نهائي ويتم خلال 48 ساعة — ستُمحى جميع بياناتك الشخصية، باستثناء المعلومات المحفوظة قانونيًا (سجل الدفع لمدة 10 سنوات، كما يفرضه القانون المحاسبي التونسي).",
    },
  },
  {
    id: "sms-reminders",
    category: "account",
    question: {
      fr: "Est-ce que je recevrai des rappels SMS ?",
      ar: "هل سأتلقى تذكيرات عبر SMS؟",
    },
    answer: {
      fr: "Oui. Un premier SMS de confirmation est envoyé immédiatement après la réservation, puis un rappel 24h avant le rendez-vous. Les SMS sont gratuits pour vous. Si vous n'en recevez pas, vérifiez que votre numéro a bien le format +216 XX XXX XXX.",
      ar: "نعم. تُرسل رسالة تأكيد فور الحجز، ثم تذكير قبل 24 ساعة من الموعد. الرسائل مجانية بالنسبة لك. إذا لم تستلمها، تأكد من أن رقمك بصيغة +216 XX XXX XXX.",
    },
  },

  // ─── SOS ─────────────────────────────────────────────────────
  {
    id: "sos-what",
    category: "sos",
    question: {
      fr: "Qu'est-ce que SOS Docteur ?",
      ar: "ما هو استغاثة طبيب؟",
    },
    answer: {
      fr: "SOS Docteur est un service de consultation d'urgence non-vitale (fièvre, douleur, infection, crise d'angoisse…). Vous décrivez votre symptôme, et un médecin disponible dans votre zone vous rappelle en moins de 2 minutes pour une téléconsultation ou une orientation adaptée.",
      ar: "استغاثة طبيب هو خدمة استشارة للطوارئ غير الحيوية (حمى، ألم، عدوى، نوبة قلق…). تصف عرضك، ثم يتصل بك طبيب متاح في منطقتك خلال أقل من دقيقتين لاستشارة عبر الفيديو أو توجيه مناسب.",
    },
  },
  {
    id: "sos-response-time",
    category: "sos",
    question: {
      fr: "En combien de temps un médecin répond-il ?",
      ar: "كم من الوقت يستغرق الطبيب للرد؟",
    },
    answer: {
      fr: "Notre engagement : un médecin vous rappelle en moins de 2 minutes, 24h/24, 7j/7. Si aucun médecin n'est disponible dans ce délai, vous êtes immédiatement orienté vers le SAMU (190) ou le service d'urgence hospitalier le plus proche.",
      ar: "تعهدنا: يتصل بك طبيب في أقل من دقيقتين، على مدار الساعة، 7/7. إذا لم يتوفر أي طبيب خلال هذا الوقت، يتم توجيهك فورًا إلى SAMU (190) أو أقرب قسم طوارئ بالمستشفى.",
    },
  },
  {
    id: "sos-zones",
    category: "sos",
    question: {
      fr: "Dans quelles villes SOS Docteur est-il disponible ?",
      ar: "في أي مدن تتوفر خدمة استغاثة طبيب؟",
    },
    answer: {
      fr: "SOS Docteur couvre actuellement le Grand Tunis : Tunis, Ariana, La Marsa, Les Berges du Lac, La Soukra, Manouba et Ben Arous. Le service s'étendra à Sfax, Sousse et Nabeul avant fin 2026.",
      ar: "تغطي خدمة استغاثة طبيب حاليًا تونس الكبرى: تونس، أريانة، المرسى، ضفاف البحيرة، السكرة، منوبة وبن عروس. ستتوسع الخدمة إلى صفاقس وسوسة ونابل قبل نهاية 2026.",
    },
  },
  {
    id: "vital-emergency",
    category: "sos",
    question: {
      fr: "Que faire en cas d'urgence vitale ?",
      ar: "ماذا أفعل في حالة طارئة تهدد الحياة؟",
    },
    answer: {
      fr: "Doktori n'est PAS un service d'urgence vitale. En cas d'infarctus, AVC, accident grave, perte de conscience, hémorragie, difficulté respiratoire majeure : composez immédiatement le 190 (SAMU) ou le 198 (Protection Civile). Ne perdez pas de temps à chercher un créneau en ligne.",
      ar: "دكتوري ليس خدمة طوارئ تهدد الحياة. في حالة نوبة قلبية، سكتة دماغية، حادث خطير، فقدان وعي، نزيف، صعوبة تنفس حادة: اتصل فورًا بـ 190 (SAMU) أو 198 (الحماية المدنية). لا تضيع الوقت في البحث عن موعد عبر الإنترنت.",
    },
  },
  {
    id: "home-visit",
    category: "sos",
    question: {
      fr: "SOS Docteur propose-t-il des visites à domicile ?",
      ar: "هل تقدم استغاثة طبيب زيارات منزلية؟",
    },
    answer: {
      fr: "Oui, certains médecins du réseau SOS acceptent les visites à domicile pour les patients non-transportables (personnes âgées, enfants avec forte fièvre, post-opératoire). Le tarif et la disponibilité sont affichés en temps réel lors de votre demande SOS.",
      ar: "نعم، يقبل بعض أطباء شبكة SOS الزيارات المنزلية للمرضى غير القادرين على التنقل (كبار السن، الأطفال ذوو الحمى الشديدة، ما بعد الجراحة). يتم عرض السعر والتوفر في الوقت الفعلي عند طلب SOS.",
    },
  },

  // ─── Application & technique ──────────────────────────────────
  {
    id: "mobile-app",
    category: "technical",
    question: {
      fr: "Existe-t-il une application mobile ?",
      ar: "هل يوجد تطبيق جوال؟",
    },
    answer: {
      fr: "Les applications iOS et Android arrivent au second semestre 2026. En attendant, le site mobile de Doktori a été conçu comme une application — vous pouvez l'installer sur votre écran d'accueil en un clic (PWA) via le menu de partage de votre navigateur.",
      ar: "ستتوفر تطبيقات iOS و Android في النصف الثاني من 2026. في غضون ذلك، تم تصميم موقع دكتوري للجوال كتطبيق — يمكنك تثبيته على شاشتك الرئيسية بنقرة واحدة (PWA) من قائمة المشاركة في متصفحك.",
    },
  },
  {
    id: "arabic-ui",
    category: "technical",
    question: {
      fr: "Puis-je utiliser Doktori en arabe ?",
      ar: "هل يمكنني استخدام دكتوري بالعربية؟",
    },
    answer: {
      fr: "Oui. Utilisez le bouton FR/AR en haut à droite de la navigation pour basculer l'interface en arabe tunisien. Les fiches des médecins, les motifs de consultation et tous les éléments du parcours de réservation sont disponibles dans les deux langues.",
      ar: "نعم. استخدم زر FR/AR أعلى شريط التنقل للتبديل إلى العربية التونسية. تتوفر ملفات الأطباء وأسباب الاستشارات وجميع عناصر مسار الحجز باللغتين.",
    },
  },
  {
    id: "geolocation",
    category: "technical",
    question: {
      fr: "Comment fonctionne la recherche par géolocalisation ?",
      ar: "كيف يعمل البحث بالموقع الجغرافي؟",
    },
    answer: {
      fr: "Cliquez sur « Médecins près de moi » dans le filtre Localisation. Votre navigateur vous demande l'autorisation d'accéder à votre position (uniquement lat/lng, jamais d'adresse). Les médecins sont ensuite triés par distance réelle, et la distance exacte s'affiche sur chaque fiche. Aucune donnée de position n'est stockée — elle reste dans votre navigateur.",
      ar: "انقر على « أطباء بالقرب مني » في فلتر الموقع. يطلب منك المتصفح الإذن بالوصول إلى موقعك (فقط خط العرض والطول، لا العنوان). يتم بعد ذلك ترتيب الأطباء حسب المسافة الفعلية، وتُعرض المسافة الدقيقة على كل ملف. لا يتم تخزين أي بيانات موقع — تبقى في متصفحك.",
    },
  },
  {
    id: "sms-not-received",
    category: "technical",
    question: {
      fr: "Je n'ai pas reçu le SMS de confirmation, que faire ?",
      ar: "لم أستلم رسالة التأكيد، ماذا أفعل؟",
    },
    answer: {
      fr: "Vérifiez d'abord le format de votre numéro (+216 XX XXX XXX). Les SMS peuvent prendre jusqu'à 5 minutes en cas de saturation du réseau Ooredoo/Orange/Tunisie Telecom. Si vous ne recevez toujours rien, contactez notre support WhatsApp — nous retrouverons votre rendez-vous et vous l'enverrons directement.",
      ar: "تحقق أولاً من صيغة رقمك (+216 XX XXX XXX). قد تستغرق الرسائل حتى 5 دقائق في حالة ازدحام شبكة Ooredoo/Orange/Tunisie Telecom. إذا لم تستلم شيئًا، اتصل بدعم WhatsApp الخاص بنا — سنجد موعدك ونرسله إليك مباشرة.",
    },
  },

  // ─── Espace médecin ──────────────────────────────────────────
  {
    id: "doctor-join",
    category: "doctor-pro",
    question: {
      fr: "Comment rejoindre Doktori en tant que médecin ?",
      ar: "كيف أنضم إلى دكتوري كطبيب؟",
    },
    answer: {
      fr: "Depuis la page « Espace médecin », remplissez le formulaire d'inscription (nom, spécialité, numéro d'Ordre, adresse du cabinet). Notre équipe valide votre profil sous 24h après vérification du CNOM. Vous recevez ensuite vos identifiants et pouvez configurer votre agenda, vos motifs de consultation et vos conventions en moins de 15 minutes.",
      ar: "من صفحة « فضاء الطبيب »، املأ نموذج التسجيل (الاسم، الاختصاص، رقم الهيئة، عنوان العيادة). يتحقق فريقنا من ملفك خلال 24 ساعة بعد التحقق من CNOM. بعد ذلك تستلم بيانات الدخول ويمكنك تهيئة جدولك وأسباب استشاراتك واتفاقياتك في أقل من 15 دقيقة.",
    },
  },
  {
    id: "doctor-price",
    category: "doctor-pro",
    question: {
      fr: "Combien coûte Doktori pour un médecin ?",
      ar: "كم تكلفة دكتوري للطبيب؟",
    },
    answer: {
      fr: "Les 100 premiers médecins inscrits bénéficient de 6 mois gratuits (programme fondateur). Ensuite, l'abonnement est de 49 DT HT par mois, tout inclus : agenda en ligne, SMS de rappel automatiques, fiche vérifiée, support WhatsApp dédié. Aucune commission sur vos consultations, jamais.",
      ar: "يستفيد أول 100 طبيب مسجل من 6 أشهر مجانية (البرنامج التأسيسي). بعد ذلك، الاشتراك هو 49 دت صافي شهريًا، يشمل كل شيء: جدول عبر الإنترنت، تذكيرات SMS تلقائية، ملف معتمد، دعم WhatsApp مخصص. لا توجد عمولات على استشاراتك، أبدًا.",
    },
  },
  {
    id: "doctor-calendar",
    category: "doctor-pro",
    question: {
      fr: "Puis-je synchroniser Doktori avec mon agenda existant (Google, Outlook) ?",
      ar: "هل يمكنني مزامنة دكتوري مع تقويمي الحالي (Google، Outlook)؟",
    },
    answer: {
      fr: "Oui. Depuis votre espace médecin, section « Agenda », activez l'export iCal : tous vos rendez-vous Doktori se synchronisent automatiquement avec Google Calendar, Apple Calendar ou Outlook. Les conflits avec vos événements existants sont détectés et bloquent automatiquement les créneaux correspondants côté Doktori.",
      ar: "نعم. من فضاء الطبيب، قسم « الأجندة »، فعّل تصدير iCal: تتم مزامنة جميع مواعيد دكتوري تلقائيًا مع Google Calendar أو Apple Calendar أو Outlook. يتم اكتشاف التعارضات مع أحداثك الحالية وتُحجب المواعيد المعنية تلقائيًا على دكتوري.",
    },
  },
];
