import type { Locale } from "@/lib/i18n/config";
import type { LegalDoc } from "./types";

export const termsOfService: Record<Locale, LegalDoc> = {
  en: {
    title: "Terms of Service",
    description: "The rules for using Boda Bora as a rider, SACCO official or insurer.",
    updatedLabel: "Last updated",
    updated: "13 November 2026",
    intro: [
      "These terms apply when you use Boda Bora: the website, the installable app, and USSD access when it launches. By signing in or using the service you agree to them. Please also read our Privacy Policy, which explains how we handle your data.",
    ],
    sections: [
      {
        title: "1. The service",
        body: [
          "Boda Bora estimates how safely a boda boda rider rides, using the phone's GPS and motion sensors. It gives riders a safety score and weekly coaching, gives SACCOs a view of their riders' safety, and lets riders share their score with insurers.",
          "Boda Bora is an early prototype built for a hackathon. Features may change, stop working or be removed, and the service may be unavailable at times.",
        ],
      },
      {
        title: "2. Your account",
        body: [
          [
            "You must be 18 or older.",
            "You sign in with a Google account. Keep it secure: you are responsible for what happens under your account.",
            "Use one account, in your own name. Don't sign in as someone else.",
            "SACCO officials and insurer staff may only use Boda Bora if their organisation has authorised them.",
          ],
        ],
      },
      {
        title: "3. Safety comes first",
        body: [
          [
            "Never use your phone while riding. Start ride mode before you set off and keep the phone secured or in your pocket.",
            "Always obey traffic laws and road signs, and wear your helmet and reflective gear.",
            "Coaching is general advice. It does not replace rider training, and you remain responsible for how you ride.",
          ],
        ],
      },
      {
        title: "4. What scores mean",
        body: [
          "Scores are estimates from phone sensors and can be wrong: GPS drops out, phones are mounted differently, and roads vary. A score is not a licence, a certificate, or a promise of insurance cover or a particular premium.",
          "Insurers decide quotes and cover themselves, and SACCOs make their own decisions about their members. Boda Bora is not responsible for those decisions.",
        ],
      },
      {
        title: "5. Fair use",
        body: [
          "You agree not to:",
          [
            "fake ride data, or record someone else's riding as your own;",
            "tamper with your phone's sensors or the app to improve a score;",
            "try to see data you are not allowed to see, or get round access controls or rate limits;",
            "disrupt, overload, scrape or reverse engineer the service;",
            "use Boda Bora for anything illegal.",
          ],
          "Boda Bora checks recorded rides against SACCO shift records, and may flag scores where recordings don't cover the shifts.",
        ],
      },
      {
        title: "6. Your data",
        body: [
          "Your ride data belongs to you. You allow us to use it to run the service as described in the Privacy Policy. You decide which insurers can see your score, and you can withdraw that at any time.",
        ],
      },
      {
        title: "7. SACCOs and insurers",
        body: [
          "If you use Boda Bora for a SACCO or an insurer, you agree to:",
          [
            "use rider data only for road safety, managing your members, or insurance the rider asked for;",
            "follow Kenya's Data Protection Act, 2019;",
            "not sell or pass rider data to anyone else;",
            "keep your access private, and tell us if you think it has been misused.",
          ],
        ],
      },
      {
        title: "8. Mobile data",
        body: [
          "The app uses mobile data to upload rides, normally over Wi-Fi or in small batches. Your network's charges apply.",
        ],
      },
      {
        title: "9. No warranty",
        body: [
          "To the extent the law allows, Boda Bora is provided \"as is\", without any promise that it will be accurate, uninterrupted or error-free.",
        ],
      },
      {
        title: "10. Limits on our liability",
        body: [
          "To the extent the law allows, Boda Bora and its team are not liable for road accidents, injuries, losses, insurance or SACCO decisions, or any indirect loss arising from your use of the service. Nothing in these terms limits rights you have under Kenyan consumer protection law that cannot be limited.",
        ],
      },
      {
        title: "11. Ending your use",
        body: [
          "You can stop using Boda Bora at any time and ask us to delete your account. We may suspend or close an account that breaks these terms or puts other people or the service at risk.",
        ],
      },
      {
        title: "12. Changes",
        body: [
          "We may update these terms. We will change the date above and, for important changes, tell you in the app. If you keep using Boda Bora after a change, the new terms apply.",
        ],
      },
      {
        title: "13. Law",
        body: ["These terms are governed by the laws of Kenya, and Kenyan courts settle any dispute about them."],
      },
      {
        title: "14. Contact us",
        body: [
          "For questions about these terms, open an issue on our GitHub page. Don't include personal details, because issues are public.",
        ],
      },
    ],
  },
  sw: {
    title: "Masharti ya Huduma",
    description: "Kanuni za kutumia Boda Bora kama mwendeshaji, afisa wa SACCO au kampuni ya bima.",
    updatedLabel: "Ilisasishwa mwisho",
    updated: "13 Novemba 2026",
    intro: [
      "Masharti haya yanatumika unapotumia Boda Bora: tovuti, programu unayoweza kusakinisha, na huduma ya USSD itakapoanza. Kwa kuingia au kutumia huduma, unakubali masharti haya. Tafadhali soma pia Sera yetu ya Faragha, inayoeleza jinsi tunavyoshughulikia data yako.",
    ],
    sections: [
      {
        title: "1. Huduma",
        body: [
          "Boda Bora hukadiria jinsi mwendeshaji wa boda boda anavyoendesha kwa usalama, kwa kutumia GPS na vihisi mwendo vya simu. Humpa mwendeshaji alama ya usalama na ushauri wa kila wiki, huzipa SACCO mwonekano wa usalama wa waendeshaji wao, na huwaruhusu waendeshaji kushiriki alama zao na kampuni za bima.",
          "Boda Bora ni mfano wa awali uliojengwa kwa ajili ya hackathon. Vipengele vinaweza kubadilika, kuacha kufanya kazi au kuondolewa, na huduma inaweza kukosekana mara kwa mara.",
        ],
      },
      {
        title: "2. Akaunti yako",
        body: [
          [
            "Lazima uwe na umri wa miaka 18 au zaidi.",
            "Unaingia kwa akaunti ya Google. Ilinde: unawajibika kwa kinachofanyika kwenye akaunti yako.",
            "Tumia akaunti moja, kwa jina lako. Usiingie kama mtu mwingine.",
            "Maafisa wa SACCO na wafanyakazi wa kampuni za bima wanaweza kutumia Boda Bora tu ikiwa shirika lao limewaidhinisha.",
          ],
        ],
      },
      {
        title: "3. Usalama kwanza",
        body: [
          [
            "Usitumie simu kamwe ukiwa unaendesha. Washa hali ya kuendesha kabla ya kuanza safari na weka simu mahali salama au mfukoni.",
            "Fuata sheria za barabarani na alama za barabarani kila wakati, na vaa kofia ngumu na vazi linaloakisi mwanga.",
            "Ushauri ni wa jumla. Haubadilishi mafunzo ya uendeshaji, na unabaki kuwajibika kwa jinsi unavyoendesha.",
          ],
        ],
      },
      {
        title: "4. Maana ya alama",
        body: [
          "Alama ni makadirio kutoka kwa vihisi vya simu na zinaweza kuwa si sahihi: GPS hupotea, simu huwekwa kwa njia tofauti, na barabara hutofautiana. Alama si leseni, cheti, wala ahadi ya bima au kiwango fulani cha malipo ya bima.",
          "Kampuni za bima huamua bei na bima zenyewe, na SACCO hufanya maamuzi yao kuhusu wanachama wao. Boda Bora haiwajibiki kwa maamuzi hayo.",
        ],
      },
      {
        title: "5. Matumizi ya haki",
        body: [
          "Unakubali kutofanya yafuatayo:",
          [
            "kughushi data ya safari, au kurekodi uendeshaji wa mtu mwingine kama wako;",
            "kuchezea vihisi vya simu yako au programu ili kuboresha alama;",
            "kujaribu kuona data usiyoruhusiwa kuona, au kukwepa vidhibiti vya ufikiaji au vikomo vya matumizi;",
            "kuvuruga, kulemea, kunakili kwa wingi au kuchambua huduma kinyume;",
            "kutumia Boda Bora kwa jambo lolote lisilo halali.",
          ],
          "Boda Bora hulinganisha safari zilizorekodiwa na rekodi za zamu za SACCO, na inaweza kuweka alama ya tahadhari pale rekodi hazishughulikii zamu.",
        ],
      },
      {
        title: "6. Data yako",
        body: [
          "Data ya safari zako ni yako. Unaturuhusu kuitumia kuendesha huduma kama ilivyoelezwa kwenye Sera ya Faragha. Wewe ndiye unaamua ni kampuni zipi za bima zinaweza kuona alama yako, na unaweza kuondoa ruhusa hiyo wakati wowote.",
        ],
      },
      {
        title: "7. SACCO na kampuni za bima",
        body: [
          "Ukitumia Boda Bora kwa niaba ya SACCO au kampuni ya bima, unakubali:",
          [
            "kutumia data ya waendeshaji tu kwa usalama barabarani, kusimamia wanachama wako, au bima ambayo mwendeshaji aliomba;",
            "kufuata Sheria ya Ulinzi wa Data ya Kenya, 2019;",
            "kutouza wala kumpa mtu mwingine data ya waendeshaji;",
            "kuweka ufikiaji wako kwa siri, na kutujulisha ukidhani umetumiwa vibaya.",
          ],
        ],
      },
      {
        title: "8. Data ya simu",
        body: [
          "Programu hutumia data ya simu kupakia safari, kwa kawaida kupitia Wi-Fi au kwa vifurushi vidogo. Gharama za mtandao wako zinatumika.",
        ],
      },
      {
        title: "9. Hakuna dhamana",
        body: [
          "Kwa kiwango kinachoruhusiwa na sheria, Boda Bora inatolewa \"kama ilivyo\", bila ahadi kwamba itakuwa sahihi, bila kukatizwa au bila makosa.",
        ],
      },
      {
        title: "10. Mipaka ya dhima yetu",
        body: [
          "Kwa kiwango kinachoruhusiwa na sheria, Boda Bora na timu yake hawawajibiki kwa ajali za barabarani, majeraha, hasara, maamuzi ya bima au SACCO, au hasara yoyote isiyo ya moja kwa moja inayotokana na matumizi yako ya huduma. Hakuna chochote katika masharti haya kinachopunguza haki ulizo nazo chini ya sheria ya Kenya ya kulinda watumiaji ambazo haziwezi kupunguzwa.",
        ],
      },
      {
        title: "11. Kuacha kutumia huduma",
        body: [
          "Unaweza kuacha kutumia Boda Bora wakati wowote na kutuomba tufute akaunti yako. Tunaweza kusimamisha au kufunga akaunti inayovunja masharti haya au inayohatarisha watu wengine au huduma.",
        ],
      },
      {
        title: "12. Mabadiliko",
        body: [
          "Tunaweza kusasisha masharti haya. Tutabadilisha tarehe iliyo juu na, kwa mabadiliko muhimu, tutakujulisha kwenye programu. Ukiendelea kutumia Boda Bora baada ya mabadiliko, masharti mapya yanatumika.",
        ],
      },
      {
        title: "13. Sheria",
        body: ["Masharti haya yanaongozwa na sheria za Kenya, na mahakama za Kenya ndizo zitaamua mzozo wowote kuhusu masharti haya."],
      },
      {
        title: "14. Wasiliana nasi",
        body: [
          "Kwa maswali kuhusu masharti haya, fungua \"issue\" kwenye ukurasa wetu wa GitHub. Usiweke maelezo yako binafsi kwa sababu \"issues\" ni za umma.",
        ],
      },
    ],
  },
};
