import React from 'react';

export const DesertOasisBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none bg-[#F7F3E9]">
      {/* Background canvas gradient tone matching the warm sand/ivory parchment */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF6ED] via-[#F6F1E5] to-[#EFE7D8]" />

      {/* High-fidelity Vector Desert Oasis & Majlis Illustration */}
      <svg
        className="absolute inset-0 w-full h-full object-cover"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A88B57" />
            <stop offset="50%" stopColor="#C4A86C" />
            <stop offset="100%" stopColor="#967744" />
          </linearGradient>
          <linearGradient id="duneShade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#EDE3CE" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#DFCFA8" stopOpacity="0.5" />
          </linearGradient>
          <pattern id="saduPattern" width="20" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 5 L5 0 L10 5 L15 0 L20 5 L15 10 L10 5 L5 10 Z" stroke="#B89C66" strokeWidth="0.75" fill="none" />
          </pattern>
          <pattern id="carpetPattern" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="none" stroke="#B89C66" strokeWidth="0.5" />
            <polygon points="12,2 22,12 12,22 2,12" stroke="#A88B57" strokeWidth="0.75" fill="none" />
            <circle cx="12" cy="12" r="3" stroke="#B89C66" strokeWidth="0.5" fill="none" />
          </pattern>
        </defs>

        {/* 1. Distant Desert Sand Dunes & Horizon (Far Left & Center) */}
        <g stroke="#B89C66" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
          {/* Distant mountains / high dune ridge */}
          <path d="M-50 330 Q180 250 300 240 T650 360 T900 370" strokeWidth="1.5" />
          <path d="M300 240 Q400 300 500 380" strokeWidth="1.2" />
          
          {/* Secondary dune ridge */}
          <path d="M-20 440 Q250 370 450 410 T800 420" strokeWidth="1.3" />
          
          {/* Wind ripples on dunes (Left side) */}
          <path d="M20 500 Q120 485 220 500" strokeWidth="0.7" opacity="0.6" />
          <path d="M40 520 Q150 505 260 520" strokeWidth="0.7" opacity="0.6" />
          <path d="M10 545 Q130 530 250 545" strokeWidth="0.7" opacity="0.6" />
          <path d="M50 570 Q170 550 300 575" strokeWidth="0.8" opacity="0.6" />
          <path d="M30 600 Q160 580 320 605" strokeWidth="0.8" opacity="0.6" />
          <path d="M80 635 Q220 610 380 640" strokeWidth="0.9" opacity="0.7" />
          <path d="M50 670 Q200 645 400 675" strokeWidth="0.9" opacity="0.7" />

          {/* Foreground wind ripples sweeping towards bottom-center */}
          <path d="M0 780 Q180 730 450 800" strokeWidth="1.1" />
          <path d="M10 820 Q190 770 500 840" strokeWidth="1.1" />
          <path d="M20 860 Q220 810 550 890" strokeWidth="1.2" />
          <path d="M0 910 Q240 850 600 940" strokeWidth="1.2" />
          <path d="M15 960 Q270 900 650 990" strokeWidth="1.3" />
          <path d="M10 1010 Q300 950 720 1050" strokeWidth="1.4" />
        </g>

        {/* 2. Date Palm Trees Oasis Grove (Center to Right Background) */}
        <g stroke="#9C7F4A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          
          {/* Palm 1 - Left cluster (X: ~680, Y: ~420) */}
          <g id="palm-left-1">
            {/* Trunk */}
            <path d="M690 470 Q685 360 670 240" strokeWidth="3" />
            <path d="M698 470 Q693 360 678 240" strokeWidth="2.5" />
            {/* Trunk rings */}
            <path d="M684 430 L694 427 M682 400 L692 397 M679 370 L689 367 M676 340 L686 337 M673 310 L683 307 M670 280 L680 277 M668 250 L678 247" strokeWidth="1" />
            {/* Fronds */}
            <path d="M674 240 Q620 220 570 270 M674 240 Q630 190 590 190 M674 240 Q650 160 630 140 M674 240 Q680 140 700 130 M674 240 Q710 160 740 180 M674 240 Q740 210 770 260 M674 240 Q700 240 730 300" strokeWidth="1.5" />
            {/* Leaflet lines */}
            <path d="M570 270 Q620 240 674 240 M590 190 Q630 210 674 240 M630 140 Q650 190 674 240 M700 130 Q690 180 674 240 M740 180 Q710 210 674 240 M770 260 Q720 250 674 240" strokeWidth="0.8" opacity="0.8" />
          </g>

          {/* Palm 2 - Tall Center Palm (X: ~860, Y: ~100 to 420) */}
          <g id="palm-center-tall">
            <path d="M885 450 Q875 280 860 140" strokeWidth="4" />
            <path d="M895 450 Q885 280 870 140" strokeWidth="3" />
            {/* Trunk rings */}
            <path d="M880 410 L892 407 M878 370 L890 367 M875 330 L887 327 M872 290 L884 287 M868 250 L880 247 M865 210 L877 207 M862 170 L874 167" strokeWidth="1.2" />
            {/* Dense Palm Crown */}
            <path d="M865 140 Q780 110 710 180" strokeWidth="1.8" />
            <path d="M865 140 Q800 60 740 80" strokeWidth="1.8" />
            <path d="M865 140 Q840 20 810 30" strokeWidth="1.8" />
            <path d="M865 140 Q875 10 900 20" strokeWidth="1.8" />
            <path d="M865 140 Q920 40 960 70" strokeWidth="1.8" />
            <path d="M865 140 Q950 100 1000 160" strokeWidth="1.8" />
            <path d="M865 140 Q920 160 970 230" strokeWidth="1.8" />
            <path d="M865 140 Q820 180 770 250" strokeWidth="1.8" />
            {/* Date bunches */}
            <circle cx="855" cy="165" r="7" fill="#C4A86C" stroke="#8A6E3B" strokeWidth="0.8" />
            <circle cx="875" cy="165" r="7" fill="#C4A86C" stroke="#8A6E3B" strokeWidth="0.8" />
          </g>

          {/* Palm 3 - Center Right (X: ~1040) */}
          <g id="palm-center-right">
            <path d="M1050 440 Q1045 260 1030 90" strokeWidth="4.5" />
            <path d="M1062 440 Q1057 260 1042 90" strokeWidth="3.5" />
            {/* Crown */}
            <path d="M1036 90 Q940 70 870 140" strokeWidth="1.8" />
            <path d="M1036 90 Q970 10 920 40" strokeWidth="1.8" />
            <path d="M1036 90 Q1030 -10 1060 10" strokeWidth="1.8" />
            <path d="M1036 90 Q1090 20 1140 60" strokeWidth="1.8" />
            <path d="M1036 90 Q1120 80 1180 150" strokeWidth="1.8" />
            <path d="M1036 90 Q1080 130 1130 210" strokeWidth="1.8" />
          </g>

          {/* Palm 4 - Right background cluster (X: ~1200 - 1500) */}
          <g id="palm-right-cluster">
            <path d="M1250 420 Q1240 250 1225 100" strokeWidth="3.5" />
            <path d="M1260 420 Q1250 250 1235 100" strokeWidth="2.5" />
            <path d="M1230 100 Q1130 90 1070 160 M1230 100 Q1170 30 1130 50 M1230 100 Q1240 0 1270 20 M1230 100 Q1300 40 1340 90 M1230 100 Q1310 110 1360 180" strokeWidth="1.5" />

            <path d="M1450 380 Q1455 240 1465 110" strokeWidth="3.5" />
            <path d="M1460 380 Q1465 240 1475 110" strokeWidth="2.5" />
            <path d="M1470 110 Q1380 90 1320 150 M1470 110 Q1420 30 1380 40 M1470 110 Q1480 10 1510 30 M1470 110 Q1530 50 1580 100 M1470 110 Q1540 120 1590 190" strokeWidth="1.5" />

            <path d="M1650 360 Q1660 220 1680 90" strokeWidth="3.5" />
            <path d="M1660 360 Q1670 220 1690 90" strokeWidth="2.5" />
            <path d="M1685 90 Q1590 80 1530 140 M1685 90 Q1640 20 1600 30 M1685 90 Q1700 0 1730 20 M1685 90 Q1750 40 1800 90 M1685 90 Q1760 110 1810 180" strokeWidth="1.5" />
          </g>
        </g>

        {/* 3. Primary Bedouin Majlis Tent (Center Foreground: X: ~680-1420, Y: ~360-700) */}
        <g id="main-majlis-tent" stroke="#8A6E3B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Main Tent Fabric Canopy Roof */}
          <polygon points="980,360 670,550 1330,550" strokeWidth="2" fill="#FAF5EB" fillOpacity="0.8" />
          
          {/* Canopy peak & tension lines */}
          <path d="M980 360 L980 550" strokeWidth="1.2" strokeDasharray="3 3" />
          <path d="M980 360 L825 550 M980 360 L1155 550" strokeWidth="1.2" />

          {/* Roof Ridge details & valance border */}
          <path d="M660 550 L1340 550" strokeWidth="2.5" />
          <path d="M660 562 L1340 562" strokeWidth="1.5" />
          {/* Sadu decorative trim on valance */}
          <path d="M665 550 L675 562 L685 550 L695 562 L705 550 L715 562 L725 550 L735 562 L745 550 L755 562 L765 550 L775 562 L785 550 L795 562 L805 550 L815 562 L825 550 L835 562 L845 550 L855 562 L865 550 L875 562 L885 550 L895 562 L905 550 L915 562 L925 550 L935 562 L945 550 L955 562 L965 550 L975 562 L985 550 L995 562 L1005 550 L1015 562 L1025 550 L1035 562 L1045 550 L1055 562 L1065 550 L1075 562 L1085 550 L1095 562 L1105 550 L1115 562 L1125 550 L1135 562 L1145 550 L1155 562 L1165 550 L1175 562 L1185 550 L1195 562 L1205 550 L1215 562 L1225 550 L1235 562 L1245 550 L1255 562 L1265 550 L1275 562 L1285 550 L1295 562 L1305 550 L1315 562 L1325 550 L1335 562" strokeWidth="0.8" />

          {/* Wooden support poles */}
          <path d="M720 550 L720 635" strokeWidth="2.5" />
          <path d="M890 550 L890 635" strokeWidth="2.5" />
          <path d="M1070 550 L1070 635" strokeWidth="2.5" />
          <path d="M1280 550 L1280 635" strokeWidth="2.5" />

          {/* Guy Ropes and ground stakes */}
          <path d="M660 550 L590 640 M590 640 L585 648" strokeWidth="1.5" />
          <path d="M720 550 L640 645 M640 645 L635 653" strokeWidth="1.2" />
          <path d="M1280 550 L1370 645 M1370 645 L1375 653" strokeWidth="1.2" />
          <path d="M1340 550 L1410 640 M1410 640 L1415 648" strokeWidth="1.5" />

          {/* Tent Interior Back Wall with Sadu woven strips */}
          <rect x="710" y="562" width="580" height="70" fill="#F4EDE0" stroke="#9E814E" strokeWidth="1" />
          <path d="M710 580 L1290 580 M710 600 L1290 600 M710 618 L1290 618" strokeWidth="0.8" strokeDasharray="6 3" />

          {/* Majlis Seating / Low Sofas and Bolster Cushions */}
          {/* Back rest cushions */}
          <rect x="730" y="585" width="540" height="30" rx="4" fill="#F7F1E4" stroke="#8A6E3B" strokeWidth="1.5" />
          {/* Cushion segment lines & geometric motifs */}
          <path d="M790 585 L790 615 M850 585 L850 615 M910 585 L910 615 M970 585 L970 615 M1030 585 L1030 615 M1090 585 L1090 615 M1150 585 L1150 615 M1210 585 L1210 615" strokeWidth="1" />
          
          {/* Floor Seating Mattress */}
          <polygon points="710,625 1290,625 1320,655 680,655" fill="#F0E6D2" stroke="#8A6E3B" strokeWidth="1.5" />
          
          {/* Side Bolster Pillows (Cylindrical) */}
          <ellipse cx="685" cy="635" rx="18" ry="10" fill="#FAF5EB" stroke="#8A6E3B" strokeWidth="1.5" />
          <ellipse cx="1315" cy="635" rx="18" ry="10" fill="#FAF5EB" stroke="#8A6E3B" strokeWidth="1.5" />

          {/* Front Carpet (Persian/Arabian Geometric Kilim Rug) */}
          <polygon points="650,655 1200,655 1130,735 550,735" fill="#FBF8F0" stroke="#8A6E3B" strokeWidth="1.8" />
          {/* Inner Carpet Borders */}
          <polygon points="665,662 1180,662 1120,727 575,727" fill="none" stroke="#9E814E" strokeWidth="1" />
          <polygon points="680,670 1160,670 1108,719 600,719" fill="none" stroke="#B89C66" strokeWidth="0.8" />
          {/* Carpet Medallions / Diamond Stars */}
          <polygon points="760,695 790,680 820,695 790,710" stroke="#8A6E3B" strokeWidth="1" fill="none" />
          <polygon points="860,695 890,680 920,695 890,710" stroke="#8A6E3B" strokeWidth="1" fill="none" />
          <polygon points="960,695 990,680 1020,695 990,710" stroke="#8A6E3B" strokeWidth="1" fill="none" />
          {/* Carpet Tassels / Fringe */}
          <path d="M550 735 L545 742 M560 735 L555 742 M570 735 L565 742 M580 735 L575 742 M590 735 L585 742 M600 735 L595 742 M610 735 L605 742" strokeWidth="1" />
        </g>

        {/* 4. Arabian Coffee Set: Dallah Pot & Finjan Cups (Front of Tent) */}
        <g id="dallah-coffee-set" stroke="#785E2D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          {/* Circular Brass Serving Tray */}
          <ellipse cx="1110" cy="740" rx="90" ry="24" fill="#FAF5EB" stroke="#785E2D" strokeWidth="1.8" />
          <ellipse cx="1110" cy="740" rx="82" ry="20" fill="none" stroke="#A88B57" strokeWidth="1" strokeDasharray="3 2" />

          {/* Dallah (Traditional Arabian Coffee Pot) */}
          <g id="dallah-pot">
            {/* Base */}
            <ellipse cx="1135" cy="735" rx="18" ry="6" fill="#EDE1C7" stroke="#785E2D" strokeWidth="1.5" />
            {/* Lower Body Bulb */}
            <path d="M1117 735 C1117 705 1125 690 1130 670 L1140 670 C1145 690 1153 705 1153 735" fill="#FAF5EB" stroke="#785E2D" strokeWidth="1.5" />
            {/* Waist band */}
            <ellipse cx="1135" cy="670" rx="7" ry="2.5" fill="#EDE1C7" stroke="#785E2D" strokeWidth="1.2" />
            {/* Neck flared up */}
            <path d="M1128 670 L1125 635 L1145 635 L1142 670" fill="#FAF5EB" stroke="#785E2D" strokeWidth="1.5" />
            {/* Conical Lid with crescent / pointed finial */}
            <path d="M1123 635 L1135 595 L1147 635 Z" fill="#EDE1C7" stroke="#785E2D" strokeWidth="1.5" />
            <circle cx="1135" cy="593" r="3" fill="#785E2D" />
            
            {/* Long elegant curved beak/spout */}
            <path d="M1126 660 Q1085 640 1080 610 Q1085 615 1098 625 L1125 645" fill="#EDE1C7" stroke="#785E2D" strokeWidth="1.5" />
            
            {/* High Arch Handle */}
            <path d="M1143 640 Q1175 645 1175 680 Q1175 715 1148 725" fill="none" stroke="#785E2D" strokeWidth="2.5" />
          </g>

          {/* Finjan (Handleless Small Arabic Coffee Cups) */}
          <g id="finjan-cups">
            {/* Cup 1 */}
            <path d="M1055 735 C1055 745 1075 745 1075 735 L1073 722 L1057 722 Z" fill="#FFFFFF" stroke="#785E2D" strokeWidth="1.3" />
            <ellipse cx="1065" cy="722" rx="8" ry="2.5" fill="#FAF5EB" stroke="#785E2D" strokeWidth="1" />
            <path d="M1060 726 Q1065 732 1070 726" stroke="#B89C66" strokeWidth="0.8" />

            {/* Cup 2 */}
            <path d="M1080 740 C1080 750 1100 750 1100 740 L1098 727 L1082 727 Z" fill="#FFFFFF" stroke="#785E2D" strokeWidth="1.3" />
            <ellipse cx="1090" cy="727" rx="8" ry="2.5" fill="#FAF5EB" stroke="#785E2D" strokeWidth="1" />
            <path d="M1085 731 Q1090 737 1095 731" stroke="#B89C66" strokeWidth="0.8" />
          </g>
        </g>

        {/* 5. Secondary Majlis Tent & Carpet in the background right */}
        <g id="secondary-tent" stroke="#9E814E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.9">
          <polygon points="1600,280 1370,420 1830,420" fill="#FAF6ED" strokeWidth="1.5" />
          <path d="M1600 280 L1600 420" strokeWidth="1" strokeDasharray="3 3" />
          <path d="M1360 420 L1840 420" strokeWidth="2" />
          {/* Secondary Tent Carpet */}
          <polygon points="1400,440 1780,440 1710,500 1320,500" fill="#FBF8F2" stroke="#9E814E" strokeWidth="1.3" />
          <polygon points="1420,448 1760,448 1700,492 1350,492" fill="none" stroke="#B89C66" strokeWidth="0.8" />
        </g>

        {/* 6. Foreground Right: Palm Fronds & Fresh Dates Platter (X: ~1200-1920, Y: ~700-1080) */}
        <g id="foreground-dates-and-fronds" stroke="#785E2D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          
          {/* Carpet under date display */}
          <polygon points="1120,740 1480,740 1380,880 970,880" fill="#FBF8F2" stroke="#8A6E3B" strokeWidth="1.5" />
          <polygon points="1135,748 1460,748 1370,868 1000,868" fill="none" stroke="#9E814E" strokeWidth="1" />
          {/* Carpet central medallion */}
          <polygon points="1210,810 1245,785 1280,810 1245,835" fill="none" stroke="#8A6E3B" strokeWidth="1" />

          {/* Large Palm Frond Branches spreading across bottom right */}
          <path d="M1920 850 Q1600 750 1350 780" strokeWidth="2.5" stroke="#664F24" />
          {/* Palm leaflets */}
          <path d="M1380 780 L1320 740 M1420 775 L1360 720 M1460 770 L1410 705 M1500 765 L1450 690 M1540 760 L1500 680 M1580 755 L1550 670" strokeWidth="1.2" />
          <path d="M1380 780 L1340 820 M1420 775 L1390 835 M1460 770 L1440 850 M1500 765 L1490 865 M1540 760 L1540 880 M1580 755 L1590 895" strokeWidth="1.2" />

          {/* Woven Bowl / Basket with Heaped Fresh Dates (Rutab) */}
          <g id="dates-bowl">
            {/* Bowl base & rim */}
            <ellipse cx="1720" cy="650" rx="90" ry="35" fill="#FAF5EB" stroke="#785E2D" strokeWidth="2" />
            <path d="M1630 650 C1630 710 1810 710 1810 650" fill="#F0E5CF" stroke="#785E2D" strokeWidth="2" />
            {/* Woven basket texture lines */}
            <path d="M1645 665 Q1720 700 1795 665 M1660 680 Q1720 705 1780 680" stroke="#9E814E" strokeWidth="1" fill="none" />
            
            {/* Mounded Dates in the bowl */}
            {/* Layer 1 */}
            <ellipse cx="1680" cy="625" rx="16" ry="10" fill="#D4B67E" stroke="#664F24" strokeWidth="1.2" transform="rotate(-15 1680 625)" />
            <ellipse cx="1710" cy="620" rx="16" ry="10" fill="#C4A365" stroke="#664F24" strokeWidth="1.2" transform="rotate(10 1710 620)" />
            <ellipse cx="1740" cy="622" rx="16" ry="10" fill="#D4B67E" stroke="#664F24" strokeWidth="1.2" transform="rotate(-25 1740 622)" />
            <ellipse cx="1765" cy="630" rx="15" ry="9" fill="#C4A365" stroke="#664F24" strokeWidth="1.2" transform="rotate(20 1765 630)" />
            {/* Top Mound */}
            <ellipse cx="1695" cy="605" rx="15" ry="9" fill="#E0C692" stroke="#664F24" strokeWidth="1.2" transform="rotate(5 1695 605)" />
            <ellipse cx="1725" cy="602" rx="16" ry="10" fill="#D4B67E" stroke="#664F24" strokeWidth="1.2" transform="rotate(-10 1725 602)" />
            <ellipse cx="1710" cy="585" rx="15" ry="9" fill="#E8D0A0" stroke="#664F24" strokeWidth="1.2" transform="rotate(15 1710 585)" />
          </g>

          {/* Wooden Serving Board with more Dates in the lower right corner */}
          <g id="lower-right-dates-board">
            <path d="M1560 850 L1920 740 L1920 1080 L1500 1080 Z" fill="#F5ECD8" stroke="#785E2D" strokeWidth="2" />
            {/* Individual luscious dates on the board & palm leaf */}
            <ellipse cx="1460" cy="740" rx="20" ry="11" fill="#D4B67E" stroke="#664F24" strokeWidth="1.3" transform="rotate(25 1460 740)" />
            <ellipse cx="1495" cy="765" rx="20" ry="11" fill="#C4A365" stroke="#664F24" strokeWidth="1.3" transform="rotate(-15 1495 765)" />
            <ellipse cx="1450" cy="790" rx="22" ry="12" fill="#D4B67E" stroke="#664F24" strokeWidth="1.3" transform="rotate(35 1450 790)" />
            <ellipse cx="1490" cy="815" rx="21" ry="11" fill="#C4A365" stroke="#664F24" strokeWidth="1.3" transform="rotate(-10 1490 815)" />
            <ellipse cx="1720" cy="800" rx="24" ry="13" fill="#D4B67E" stroke="#664F24" strokeWidth="1.4" transform="rotate(20 1720 800)" />
            <ellipse cx="1760" cy="780" rx="24" ry="13" fill="#C4A365" stroke="#664F24" strokeWidth="1.4" transform="rotate(-30 1760 780)" />
            <ellipse cx="1780" cy="830" rx="25" ry="14" fill="#D4B67E" stroke="#664F24" strokeWidth="1.4" transform="rotate(15 1780 830)" />
            <ellipse cx="1830" cy="850" rx="26" ry="14" fill="#C4A365" stroke="#664F24" strokeWidth="1.4" transform="rotate(-20 1830 850)" />
          </g>
        </g>
      </svg>

      {/* Subtle vignette & soft warm lighting gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#EDE4D2]/40 via-transparent to-[#FBF7EE]/30 pointer-events-none" />
    </div>
  );
};
