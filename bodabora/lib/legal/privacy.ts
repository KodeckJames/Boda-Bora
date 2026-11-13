import type { Locale } from "@/lib/i18n/config";
import type { LegalDoc } from "./types";

// Keep in step with what the app actually does (backend/src: ingest, scoring, coaching,
// consent, retention). Change "updated" whenever the substance changes.
export const privacyPolicy: Record<Locale, LegalDoc> = {
  en: {
    title: "Privacy Policy",
    description: "What Boda Bora collects, why, who can see it, and your rights under Kenya's Data Protection Act.",
    updatedLabel: "Last updated",
    updated: "13 November 2026",
    intro: [
      "Boda Bora turns a rider's phone into a safety recorder. It scores how safely a boda boda rider rides, coaches them weekly in English or Kiswahili, and lets riders share their score with their SACCO and, if they choose, with insurers.",
      "Boda Bora is an early prototype built for a hackathon. This policy explains what we collect, why, who can see it, and the choices and rights you have under Kenya's Data Protection Act, 2019.",
    ],
    sections: [
      {
        title: "1. What we collect",
        body: [
          [
            "Your Google account details when you sign in: your name, email address, profile photo and Google account ID. We never see your Google password.",
            "Your rider profile: name, phone number, motorcycle registration, and your SACCO and stage.",
            "Ride data, only while you are recording a shift in ride mode: GPS location and speed, motion-sensor readings (accelerometer and gyroscope) and their times. Nothing is recorded in the background or when ride mode is off.",
            "What we work out from your rides: trips, risk events (harsh braking, sharp cornering, rapid acceleration, passing known accident blackspots), night riding hours, weekly scores and coaching messages.",
            "Shift records your SACCO gives us, so we can check that your recorded rides cover your working hours.",
            "Your choices: which insurers you share your score with, quote requests, and your language preference.",
            "When USSD access launches: your phone number and the menu options you choose.",
          ],
        ],
      },
      {
        title: "2. How we use it",
        body: [
          [
            "To calculate your Rider Safety Score and show it to you.",
            "To write your weekly coaching message.",
            "To let your SACCO see the safety of its riders and spot risky places and habits.",
            "To send your score to an insurer when you ask for a quote.",
            "To check that scores are fair, for example by flagging recorded rides that don't cover a rider's shifts.",
            "To keep the service secure and prevent misuse, and to improve how scores are calculated.",
          ],
          "We do not sell your data and we do not use it for advertising.",
        ],
      },
      {
        title: "3. AI coaching",
        body: [
          "Each week we send a summary of numbers to Google's Gemini AI model so it can write your advice: scores, event counts, night hours and the names of places where risky events happened. Your name and phone number are not sent. If the AI is unavailable, a fixed template writes the message instead.",
        ],
      },
      {
        title: "4. Who can see your data",
        body: [
          [
            "You, after signing in.",
            "Officials of the SACCO you belong to, for its own riders only.",
            "Insurers, only after you agree to share your score with them. You can withdraw that at any time in the app. When you request a quote, the insurer receives a copy of your score at that moment.",
            "Companies that run the service for us: Neon (database, sign-in, file storage and servers, hosted on Amazon Web Services in Frankfurt, Germany), Vercel (website hosting) and Google (sign-in and AI coaching). They may only use the data to provide their service to us.",
            "Authorities, when Kenyan law requires it.",
          ],
          "Every time a SACCO official or insurer views a rider's data, it is recorded in an access log.",
        ],
      },
      {
        title: "5. Data stored outside Kenya",
        body: [
          "Our database and files are stored in the European Union (Frankfurt, Germany). We rely on providers with strong security and data-protection commitments, as the Data Protection Act requires for transfers outside Kenya.",
        ],
      },
      {
        title: "6. How long we keep it",
        body: [
          [
            "Raw sensor recordings are deleted automatically 90 days after upload.",
            "Trips, risk events, scores and coaching messages are kept while your account is active, so you can see your progress over time.",
            "When you ask us to delete your account, we delete your data except what the law requires us to keep, and access logs kept for security.",
          ],
        ],
      },
      {
        title: "7. Your rights",
        body: [
          "Under the Data Protection Act, 2019 you have the right to:",
          [
            "be told how your data is used (this policy);",
            "get a copy of your data;",
            "have wrong data corrected;",
            "have your data deleted;",
            "object to processing, and withdraw consent you gave, such as sharing with an insurer;",
            "receive your data in a format you can move to another service.",
          ],
          "If you are unhappy with how we handle your data, you can complain to the Office of the Data Protection Commissioner (odpc.go.ke).",
        ],
      },
      {
        title: "8. Security",
        body: [
          "Data travels over encrypted connections (HTTPS). Access is limited by role: riders see their own data, SACCO officials their own riders, and insurers only riders who agreed. Sign-in tokens expire after 15 minutes. No system is perfectly secure, but we work to protect your data and will tell affected users about a serious breach.",
        ],
      },
      {
        title: "9. Cookies and storage on your phone",
        body: [
          "We use only the cookies needed to keep you signed in and remember your language. We do not use advertising or tracking cookies. Ride mode saves recordings on your phone until they upload. Signing out clears the pages the app saved for offline use.",
        ],
      },
      {
        title: "10. Children",
        body: ["Boda Bora is for riders and staff aged 18 and over. We do not knowingly collect data from children."],
      },
      {
        title: "11. Changes to this policy",
        body: [
          "If we change this policy, we will update the date above. If a change affects how your data is shared, we will tell you in the app first.",
        ],
      },
      {
        title: "12. Contact us",
        body: [
          "To use any of your rights or ask a question, open an issue on our GitHub page titled \"Privacy request\". Don't include personal details in the issue, because it is public. We will reply with a private way to confirm who you are and complete your request.",
        ],
      },
    ],
  },
  sw: {
    title: "Sera ya Faragha",
    description: "Boda Bora inakusanya nini, kwa nini, nani anaweza kuona, na haki zako chini ya Sheria ya Ulinzi wa Data ya Kenya.",
    updatedLabel: "Ilisasishwa mwisho",
    updated: "13 Novemba 2026",
    intro: [
      "Boda Bora hugeuza simu ya mwendeshaji kuwa kinasa usalama. Hupima jinsi mwendeshaji wa boda boda anavyoendesha kwa usalama, humpa ushauri kila wiki kwa Kiswahili au Kiingereza, na humruhusu kushiriki alama yake na SACCO yake na, akipenda, na kampuni za bima.",
      "Boda Bora ni mfano wa awali uliojengwa kwa ajili ya hackathon. Sera hii inaeleza tunachokusanya, kwa nini, nani anaweza kukiona, na chaguo na haki ulizo nazo chini ya Sheria ya Ulinzi wa Data ya Kenya, 2019.",
    ],
    sections: [
      {
        title: "1. Tunachokusanya",
        body: [
          [
            "Maelezo ya akaunti yako ya Google unapoingia: jina, barua pepe, picha ya wasifu na kitambulisho cha akaunti ya Google. Hatuoni kamwe nenosiri lako la Google.",
            "Wasifu wako wa mwendeshaji: jina, nambari ya simu, nambari ya usajili wa pikipiki, na SACCO na kituo chako.",
            "Data ya safari, wakati tu unarekodi zamu kwenye hali ya kuendesha: mahali (GPS) na kasi, vipimo vya vihisi mwendo (accelerometer na gyroscope) na saa zake. Hakuna kinachorekodiwa chinichini au hali ya kuendesha ikiwa imezimwa.",
            "Tunachokokotoa kutoka kwa safari zako: safari, matukio ya hatari (kufunga breki ghafla, kukata kona kwa kasi, kuongeza mwendo ghafla, kupita maeneo hatari yanayojulikana), saa za kuendesha usiku, alama za kila wiki na ujumbe wa ushauri.",
            "Rekodi za zamu ambazo SACCO yako inatupa, ili tuhakikishe safari ulizorekodi zinashughulikia saa zako za kazi.",
            "Chaguo zako: kampuni za bima unazoshiriki nazo alama yako, maombi ya bei za bima, na lugha unayopendelea.",
            "Huduma ya USSD itakapoanza: nambari yako ya simu na chaguo za menyu unazochagua.",
          ],
        ],
      },
      {
        title: "2. Tunavyoitumia",
        body: [
          [
            "Kukokotoa Alama yako ya Usalama wa Mwendeshaji na kukuonyesha.",
            "Kuandika ujumbe wako wa ushauri wa kila wiki.",
            "Kuiwezesha SACCO yako kuona usalama wa waendeshaji wake na kutambua maeneo na tabia hatari.",
            "Kutuma alama yako kwa kampuni ya bima unapoomba bei.",
            "Kuhakikisha alama ni za haki, kwa mfano kwa kutambua safari zilizorekodiwa ambazo hazishughulikii zamu za mwendeshaji.",
            "Kulinda usalama wa huduma, kuzuia matumizi mabaya, na kuboresha jinsi alama zinavyokokotolewa.",
          ],
          "Hatuuzi data yako na hatuitumii kwa matangazo.",
        ],
      },
      {
        title: "3. Ushauri wa AI",
        body: [
          "Kila wiki tunatuma muhtasari wa nambari kwa modeli ya AI ya Google, Gemini, ili iandike ushauri wako: alama, idadi ya matukio, saa za usiku na majina ya maeneo ambapo matukio ya hatari yalitokea. Jina lako na nambari yako ya simu hazitumwi. AI isipopatikana, kiolezo maalum huandika ujumbe badala yake.",
        ],
      },
      {
        title: "4. Nani anaweza kuona data yako",
        body: [
          [
            "Wewe, baada ya kuingia.",
            "Maafisa wa SACCO unayoihusu, kwa waendeshaji wake tu.",
            "Kampuni za bima, baada tu ya wewe kukubali kushiriki alama yako nazo. Unaweza kuondoa ruhusa hiyo wakati wowote kwenye programu. Unapoomba bei, kampuni ya bima hupokea nakala ya alama yako wakati huo.",
            "Kampuni zinazoendesha huduma kwa niaba yetu: Neon (hifadhidata, kuingia, hifadhi ya faili na seva, kwenye Amazon Web Services mjini Frankfurt, Ujerumani), Vercel (kupangisha tovuti) na Google (kuingia na ushauri wa AI). Zinaweza kutumia data tu kutupa huduma yao.",
            "Mamlaka, pale sheria ya Kenya inapohitaji.",
          ],
          "Kila mara afisa wa SACCO au kampuni ya bima inapoangalia data ya mwendeshaji, hurekodiwa kwenye kumbukumbu ya ufikiaji.",
        ],
      },
      {
        title: "5. Data inayohifadhiwa nje ya Kenya",
        body: [
          "Hifadhidata na faili zetu zimehifadhiwa katika Umoja wa Ulaya (Frankfurt, Ujerumani). Tunatumia watoa huduma wenye ahadi thabiti za usalama na ulinzi wa data, kama Sheria ya Ulinzi wa Data inavyohitaji kwa uhamisho nje ya Kenya.",
        ],
      },
      {
        title: "6. Muda tunaoihifadhi",
        body: [
          [
            "Rekodi ghafi za vihisi hufutwa kiotomatiki siku 90 baada ya kupakiwa.",
            "Safari, matukio ya hatari, alama na ujumbe wa ushauri huhifadhiwa akaunti yako ikiwa hai, ili uone maendeleo yako.",
            "Ukituomba kufuta akaunti yako, tunafuta data yako isipokuwa ile sheria inayotutaka tuihifadhi, na kumbukumbu za ufikiaji zinazohifadhiwa kwa usalama.",
          ],
        ],
      },
      {
        title: "7. Haki zako",
        body: [
          "Chini ya Sheria ya Ulinzi wa Data, 2019 una haki ya:",
          [
            "kuelezwa jinsi data yako inavyotumika (sera hii);",
            "kupata nakala ya data yako;",
            "kurekebishiwa data isiyo sahihi;",
            "kufutiwa data yako;",
            "kupinga uchakataji, na kuondoa ridhaa uliyotoa, kama kushiriki na kampuni ya bima;",
            "kupokea data yako katika muundo unaoweza kuhamisha kwa huduma nyingine.",
          ],
          "Ikiwa huridhiki na jinsi tunavyoshughulikia data yako, unaweza kulalamika kwa Ofisi ya Kamishna wa Ulinzi wa Data (odpc.go.ke).",
        ],
      },
      {
        title: "8. Usalama",
        body: [
          "Data husafiri kupitia miunganisho iliyosimbwa (HTTPS). Ufikiaji umepangwa kwa majukumu: waendeshaji huona data yao, maafisa wa SACCO huona waendeshaji wao, na kampuni za bima huona tu waendeshaji waliokubali. Tokeni za kuingia huisha baada ya dakika 15. Hakuna mfumo ulio salama kabisa, lakini tunajitahidi kulinda data yako na tutawaarifu walioathiriwa iwapo kutatokea uvunjaji mkubwa.",
        ],
      },
      {
        title: "9. Vidakuzi na hifadhi kwenye simu yako",
        body: [
          "Tunatumia tu vidakuzi vinavyohitajika kukuweka umeingia na kukumbuka lugha yako. Hatutumii vidakuzi vya matangazo wala ufuatiliaji. Hali ya kuendesha huhifadhi rekodi kwenye simu yako hadi zipakiwe. Kutoka kwenye akaunti hufuta kurasa ambazo programu ilihifadhi kwa matumizi bila mtandao.",
        ],
      },
      {
        title: "10. Watoto",
        body: ["Boda Bora ni kwa waendeshaji na wafanyakazi wenye umri wa miaka 18 na zaidi. Hatukusanyi kwa makusudi data ya watoto."],
      },
      {
        title: "11. Mabadiliko ya sera hii",
        body: [
          "Tukibadilisha sera hii, tutasasisha tarehe iliyo juu. Mabadiliko yakiathiri jinsi data yako inavyoshirikiwa, tutakujulisha kwanza kwenye programu.",
        ],
      },
      {
        title: "12. Wasiliana nasi",
        body: [
          "Kutumia haki yoyote kati ya hizi au kuuliza swali, fungua \"issue\" kwenye ukurasa wetu wa GitHub yenye kichwa \"Privacy request\". Usiweke maelezo yako binafsi humo kwa sababu ni ya umma. Tutakujibu na njia ya faragha ya kuthibitisha wewe ni nani na kukamilisha ombi lako.",
        ],
      },
    ],
  },
};
