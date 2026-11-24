/* Tavupeli v3 — External Art Loader + Cohesive Picture-Book SVG Fallbacks
 * Checks img/<folder>/<id>.webp then .png; falls back seamlessly to built-in SVGs.
 */
window.TavupeliArt = (() => {
  const WORD_SVGS = {
  "kuu": "<path d=\"M126 36 C82 36 48 70 48 112 C48 148 78 172 118 170 C138 169 154 160 164 146 C142 150 118 140 106 120 C94 100 98 70 116 52 C120 46 124 41 126 36 Z\" fill=\"#E8B948\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><circle cx=\"80\" cy=\"96\" r=\"7\" fill=\"#D9A334\" opacity=\"0.65\"/><circle cx=\"92\" cy=\"134\" r=\"9\" fill=\"#D9A334\" opacity=\"0.65\"/><circle cx=\"72\" cy=\"126\" r=\"4\" fill=\"#D9A334\" opacity=\"0.65\"/>",
  "luu": "<path d=\"M58 84 C43 74 28 84 32 100 C24 114 36 132 54 126 C60 124 64 118 68 114 L132 114 C136 118 140 124 146 126 C164 132 176 114 168 100 C172 84 157 74 142 84 C138 87 135 90 132 92 L68 92 C65 90 62 87 58 84 Z\" fill=\"#F2EBD9\" stroke=\"#2E3338\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M74 104 L126 104\" stroke=\"#D8CEB6\" stroke-width=\"4\" stroke-linecap=\"round\"/>",
  "puu": "<path d=\"M88 124 L84 176 L116 176 L112 124 Z\" fill=\"#8C6245\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M100 134 L100 166\" stroke=\"#714D34\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"70\" cy=\"92\" r=\"34\" fill=\"#639A67\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"130\" cy=\"92\" r=\"34\" fill=\"#639A67\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"100\" cy=\"64\" r=\"38\" fill=\"#74AB75\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"100\" cy=\"98\" r=\"34\" fill=\"#74AB75\"/><path d=\"M62 120 C76 132 124 132 138 120\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linecap=\"round\"/>",
  "kissa": "<path d=\"M138 156 C168 152 172 116 154 106\" fill=\"none\" stroke=\"#D98A4E\" stroke-width=\"14\" stroke-linecap=\"round\"/><path d=\"M138 156 C168 152 172 116 154 106\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linecap=\"round\"/><ellipse cx=\"96\" cy=\"134\" rx=\"40\" ry=\"34\" fill=\"#D98A4E\" stroke=\"#2E3338\" stroke-width=\"6\"/><polygon points=\"62,74 56,36 86,58\" fill=\"#D98A4E\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><polygon points=\"130,74 136,36 106,58\" fill=\"#D98A4E\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><circle cx=\"96\" cy=\"84\" r=\"34\" fill=\"#E39A60\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"84\" cy=\"80\" r=\"4\" fill=\"#2E3338\"/><circle cx=\"108\" cy=\"80\" r=\"4\" fill=\"#2E3338\"/><polygon points=\"92,90 100,90 96,95\" fill=\"#C95E5E\"/><path d=\"M96 95 Q90 102 84 98 M96 95 Q102 102 108 98\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"4\" stroke-linecap=\"round\"/><path d=\"M52 84 L70 86 M52 94 L70 92 M140 84 L122 86 M140 94 L122 92\" stroke=\"#2E3338\" stroke-width=\"3.5\" stroke-linecap=\"round\"/><ellipse cx=\"78\" cy=\"166\" rx=\"11\" ry=\"7\" fill=\"#F2EBD9\" stroke=\"#2E3338\" stroke-width=\"5\"/><ellipse cx=\"114\" cy=\"166\" rx=\"11\" ry=\"7\" fill=\"#F2EBD9\" stroke=\"#2E3338\" stroke-width=\"5\"/>",
  "koira": "<path d=\"M46 112 C32 96 34 78 46 74\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linecap=\"round\"/><rect x=\"48\" y=\"96\" width=\"84\" height=\"48\" rx=\"22\" fill=\"#B5835A\" stroke=\"#2E3338\" stroke-width=\"6\"/><rect x=\"56\" y=\"136\" width=\"16\" height=\"34\" rx=\"8\" fill=\"#B5835A\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><rect x=\"108\" y=\"136\" width=\"16\" height=\"34\" rx=\"8\" fill=\"#B5835A\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><ellipse cx=\"88\" cy=\"116\" rx=\"14\" ry=\"11\" fill=\"#7D5436\"/><circle cx=\"132\" cy=\"80\" r=\"28\" fill=\"#C29166\" stroke=\"#2E3338\" stroke-width=\"6\"/><ellipse cx=\"154\" cy=\"88\" rx=\"18\" ry=\"13\" fill=\"#D4AA82\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><ellipse cx=\"168\" cy=\"83\" rx=\"6\" ry=\"5\" fill=\"#2E3338\"/><ellipse cx=\"114\" cy=\"84\" rx=\"11\" ry=\"22\" fill=\"#7D5436\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><circle cx=\"138\" cy=\"72\" r=\"4\" fill=\"#2E3338\"/><path d=\"M110 104 L138 108\" stroke=\"#D1524B\" stroke-width=\"7\" stroke-linecap=\"round\"/>",
  "pilvi": "<path d=\"M54 140 L146 140 C166 140 176 124 174 108 C172 93 158 84 144 86 C140 62 118 48 96 54 C80 58 70 70 66 84 C46 82 28 96 28 114 C28 130 40 140 54 140 Z\" fill=\"#DCE8F2\" stroke=\"#2E3338\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><path d=\"M56 126 C78 130 124 130 148 124\" fill=\"none\" stroke=\"#B7CDE0\" stroke-width=\"5\" stroke-linecap=\"round\"/>",
  "sukka": "<path d=\"M84 34 L126 34 L126 112 C126 126 138 134 152 140 C166 146 168 168 150 172 C132 176 96 162 84 144 C78 134 80 120 84 106 Z\" fill=\"#E3C878\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><rect x=\"84\" y=\"34\" width=\"42\" height=\"18\" fill=\"#D15B52\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><line x1=\"84\" y1=\"68\" x2=\"126\" y2=\"68\" stroke=\"#D15B52\" stroke-width=\"10\"/><line x1=\"84\" y1=\"90\" x2=\"126\" y2=\"90\" stroke=\"#4D7EA8\" stroke-width=\"10\"/><path d=\"M84 106 L84 34 M126 106 L126 34\" stroke=\"#2E3338\" stroke-width=\"6\"/><path d=\"M138 138 C146 142 152 156 146 170\" fill=\"none\" stroke=\"#D15B52\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M84 34 L126 34 L126 112 C126 126 138 134 152 140 C166 146 168 168 150 172 C132 176 96 162 84 144 C78 134 80 120 84 106 Z\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/>",
  "vene": "<line x1=\"68\" y1=\"92\" x2=\"36\" y2=\"148\" stroke=\"#B5835A\" stroke-width=\"8\" stroke-linecap=\"round\"/><line x1=\"68\" y1=\"92\" x2=\"36\" y2=\"148\" stroke=\"#2E3338\" stroke-width=\"4\" stroke-linecap=\"round\"/><line x1=\"132\" y1=\"92\" x2=\"164\" y2=\"148\" stroke=\"#B5835A\" stroke-width=\"8\" stroke-linecap=\"round\"/><line x1=\"132\" y1=\"92\" x2=\"164\" y2=\"148\" stroke=\"#2E3338\" stroke-width=\"4\" stroke-linecap=\"round\"/><rect x=\"74\" y=\"84\" width=\"52\" height=\"12\" rx=\"4\" fill=\"#D4A676\" stroke=\"#2E3338\" stroke-width=\"5\"/><path d=\"M28 96 L172 96 C164 134 140 152 100 152 C60 152 36 134 28 96 Z\" fill=\"#C4784B\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M40 116 L160 116\" stroke=\"#F0E6D2\" stroke-width=\"6\" stroke-linecap=\"round\"/>",
  "banaani": "<path d=\"M52 140 C86 158 144 134 156 76 C158 64 154 54 148 48 L138 56 C134 98 98 124 58 122 C48 122 42 132 52 140 Z\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M148 48 L154 38 L144 36 L140 48 Z\" fill=\"#6E5035\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><circle cx=\"48\" cy=\"133\" r=\"5\" fill=\"#6E5035\"/><path d=\"M74 134 C106 134 134 112 144 82\" fill=\"none\" stroke=\"#D9AD2E\" stroke-width=\"4\" stroke-linecap=\"round\"/>",
  "kirahvi": "<rect x=\"66\" y=\"132\" width=\"12\" height=\"44\" rx=\"5\" fill=\"#E6B85C\" stroke=\"#2E3338\" stroke-width=\"5\"/><rect x=\"108\" y=\"132\" width=\"12\" height=\"44\" rx=\"5\" fill=\"#E6B85C\" stroke=\"#2E3338\" stroke-width=\"5\"/><path d=\"M56 118 C42 126 42 142 46 150\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linecap=\"round\"/><ellipse cx=\"92\" cy=\"122\" rx=\"34\" ry=\"22\" fill=\"#E6B85C\" stroke=\"#2E3338\" stroke-width=\"6\"/><path d=\"M104 106 L120 42 L138 46 L124 114 Z\" fill=\"#E6B85C\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><ellipse cx=\"142\" cy=\"48\" rx=\"18\" ry=\"12\" fill=\"#E6B85C\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><line x1=\"124\" y1=\"36\" x2=\"120\" y2=\"24\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linecap=\"round\"/><circle cx=\"120\" cy=\"22\" r=\"4\" fill=\"#7D5234\"/><line x1=\"134\" y1=\"36\" x2=\"136\" y2=\"24\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linecap=\"round\"/><circle cx=\"136\" cy=\"22\" r=\"4\" fill=\"#7D5234\"/><circle cx=\"144\" cy=\"44\" r=\"3.5\" fill=\"#2E3338\"/><circle cx=\"82\" cy=\"118\" r=\"7\" fill=\"#9E6238\"/><circle cx=\"102\" cy=\"126\" r=\"6\" fill=\"#9E6238\"/><circle cx=\"122\" cy=\"74\" r=\"5\" fill=\"#9E6238\"/><circle cx=\"116\" cy=\"94\" r=\"5\" fill=\"#9E6238\"/>",
  "kitara": "<rect x=\"92\" y=\"28\" width=\"16\" height=\"72\" rx=\"4\" fill=\"#8C5A3C\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><rect x=\"86\" y=\"20\" width=\"28\" height=\"18\" rx=\"4\" fill=\"#6E442C\" stroke=\"#2E3338\" stroke-width=\"5\"/><path d=\"M100 84 C74 84 62 100 68 118 C52 128 50 156 68 168 C82 178 118 178 132 168 C150 156 148 128 132 118 C138 100 126 84 100 84 Z\" fill=\"#D99B52\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><circle cx=\"100\" cy=\"124\" r=\"14\" fill=\"#4A3224\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><rect x=\"84\" y=\"150\" width=\"32\" height=\"8\" rx=\"3\" fill=\"#4A3224\"/><line x1=\"97\" y1=\"36\" x2=\"97\" y2=\"150\" stroke=\"#F4EFE6\" stroke-width=\"2\"/><line x1=\"103\" y1=\"36\" x2=\"103\" y2=\"150\" stroke=\"#F4EFE6\" stroke-width=\"2\"/>",
  "omena": "<path d=\"M100 62 C98 44 106 34 114 30\" fill=\"none\" stroke=\"#6E4B32\" stroke-width=\"6\" stroke-linecap=\"round\"/><path d=\"M104 52 C118 34 138 36 142 50 C128 60 112 58 104 52 Z\" fill=\"#6A9E5C\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M100 66 C74 52 44 72 46 110 C48 148 72 172 94 166 C98 165 102 165 106 166 C128 172 152 148 154 110 C156 72 126 52 100 66 Z\" fill=\"#D45048\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M66 94 C64 82 72 74 82 74\" fill=\"none\" stroke=\"#F29E96\" stroke-width=\"6\" stroke-linecap=\"round\"/>",
  "perhonen": "<path d=\"M96 96 C64 46 28 54 34 94 C38 114 66 118 94 112 Z\" fill=\"#E39B4F\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M104 96 C136 46 172 54 166 94 C162 114 134 118 106 112 Z\" fill=\"#E39B4F\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M96 114 C64 116 44 138 56 158 C68 172 90 156 96 132 Z\" fill=\"#D66B5E\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M104 114 C136 116 156 138 144 158 C132 172 110 156 104 132 Z\" fill=\"#D66B5E\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><circle cx=\"62\" cy=\"88\" r=\"10\" fill=\"#F2DC9B\"/><circle cx=\"138\" cy=\"88\" r=\"10\" fill=\"#F2DC9B\"/><rect x=\"93\" y=\"68\" width=\"14\" height=\"74\" rx=\"7\" fill=\"#3D434A\" stroke=\"#2E3338\" stroke-width=\"5\"/><path d=\"M96 68 Q84 48 76 50 M104 68 Q116 48 124 50\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linecap=\"round\"/>",
  "krokotiili": "<path d=\"M26 124 C44 100 68 96 104 98 L168 100 C178 100 182 112 174 120 L166 126 L124 126 L124 138 L46 138 C32 138 22 132 26 124 Z\" fill=\"#5D9963\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M48 102 L58 88 L68 100 L78 86 L88 98 L98 86 L108 98\" fill=\"#467A4C\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><circle cx=\"122\" cy=\"92\" r=\"10\" fill=\"#5D9963\" stroke=\"#2E3338\" stroke-width=\"5\"/><circle cx=\"124\" cy=\"91\" r=\"3.5\" fill=\"#2E3338\"/><polygon points=\"134,126 140,136 146,126\" fill=\"#FFFFFF\" stroke=\"#2E3338\" stroke-width=\"3.5\"/><polygon points=\"150,126 156,136 162,126\" fill=\"#FFFFFF\" stroke=\"#2E3338\" stroke-width=\"3.5\"/><rect x=\"66\" y=\"134\" width=\"18\" height=\"22\" rx=\"6\" fill=\"#4E8554\" stroke=\"#2E3338\" stroke-width=\"5\"/><rect x=\"108\" y=\"134\" width=\"18\" height=\"22\" rx=\"6\" fill=\"#4E8554\" stroke=\"#2E3338\" stroke-width=\"5\"/>",
  "lumiukko": "<circle cx=\"100\" cy=\"144\" r=\"36\" fill=\"#EBF3F8\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"100\" cy=\"96\" r=\"27\" fill=\"#EBF3F8\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"100\" cy=\"56\" r=\"20\" fill=\"#F2F7FA\" stroke=\"#2E3338\" stroke-width=\"6\"/><rect x=\"82\" y=\"20\" width=\"36\" height=\"20\" rx=\"3\" fill=\"#3B424A\" stroke=\"#2E3338\" stroke-width=\"5\"/><line x1=\"72\" y1=\"40\" x2=\"128\" y2=\"40\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linecap=\"round\"/><rect x=\"80\" y=\"72\" width=\"40\" height=\"11\" rx=\"5\" fill=\"#D1524B\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><path d=\"M110 82 L120 106 L108 108 L102 82 Z\" fill=\"#D1524B\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><polygon points=\"100,56 128,60 100,64\" fill=\"#E38239\" stroke=\"#2E3338\" stroke-width=\"4\" stroke-linejoin=\"round\"/><circle cx=\"93\" cy=\"51\" r=\"3\" fill=\"#2E3338\"/><circle cx=\"107\" cy=\"51\" r=\"3\" fill=\"#2E3338\"/><circle cx=\"100\" cy=\"96\" r=\"3.5\" fill=\"#2E3338\"/><circle cx=\"100\" cy=\"110\" r=\"3.5\" fill=\"#2E3338\"/><path d=\"M72 96 L44 82 M128 96 L156 82\" stroke=\"#6E4E37\" stroke-width=\"5\" stroke-linecap=\"round\"/>",
  "paloauto": "<rect x=\"28\" y=\"84\" width=\"102\" height=\"58\" rx=\"8\" fill=\"#D44C44\" stroke=\"#2E3338\" stroke-width=\"6\"/><path d=\"M130 92 L162 92 L174 114 L174 142 L130 142 Z\" fill=\"#D44C44\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><polygon points=\"136,100 156,100 164,116 136,116\" fill=\"#DCEAF4\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><rect x=\"138\" y=\"78\" width=\"16\" height=\"14\" rx=\"5\" fill=\"#4682B4\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><rect x=\"34\" y=\"66\" width=\"90\" height=\"14\" rx=\"3\" fill=\"#F4F1EA\" stroke=\"#2E3338\" stroke-width=\"5\"/><line x1=\"52\" y1=\"66\" x2=\"52\" y2=\"80\" stroke=\"#2E3338\" stroke-width=\"4\"/><line x1=\"74\" y1=\"66\" x2=\"74\" y2=\"80\" stroke=\"#2E3338\" stroke-width=\"4\"/><line x1=\"96\" y1=\"66\" x2=\"96\" y2=\"80\" stroke=\"#2E3338\" stroke-width=\"4\"/><line x1=\"36\" y1=\"114\" x2=\"124\" y2=\"114\" stroke=\"#F4F1EA\" stroke-width=\"8\"/><circle cx=\"62\" cy=\"146\" r=\"18\" fill=\"#3D434A\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><circle cx=\"62\" cy=\"146\" r=\"7\" fill=\"#D9D5CC\"/><circle cx=\"144\" cy=\"146\" r=\"18\" fill=\"#3D434A\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><circle cx=\"144\" cy=\"146\" r=\"7\" fill=\"#D9D5CC\"/>",
  "sateenvarjo": "<path d=\"M100 44 L100 156 C100 168 82 172 78 158\" fill=\"none\" stroke=\"#6E4E37\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M30 104 C32 62 64 42 100 42 C136 42 168 62 170 104 C156 96 144 96 134 104 C122 96 110 96 100 104 C90 96 78 96 66 104 C56 96 44 96 30 104 Z\" fill=\"#4A80B5\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M100 42 C82 54 70 76 66 104 C78 96 90 96 100 104 C110 96 122 96 134 104 C130 76 118 54 100 42 Z\" fill=\"#E39B4F\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><circle cx=\"100\" cy=\"36\" r=\"5\" fill=\"#2E3338\"/>",
  "helikopteri": "<line x1=\"38\" y1=\"54\" x2=\"162\" y2=\"54\" stroke=\"#2E3338\" stroke-width=\"7\" stroke-linecap=\"round\"/><line x1=\"104\" y1=\"54\" x2=\"104\" y2=\"78\" stroke=\"#2E3338\" stroke-width=\"7\"/><path d=\"M142 100 L176 92 L176 106 L142 114 Z\" fill=\"#3C8D8F\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><circle cx=\"176\" cy=\"96\" r=\"12\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"5\"/><ellipse cx=\"98\" cy=\"106\" rx=\"48\" ry=\"30\" fill=\"#3C8D8F\" stroke=\"#2E3338\" stroke-width=\"6\"/><path d=\"M56 104 C56 86 76 80 94 80 L94 108 L56 108 Z\" fill=\"#DCEAF4\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><line x1=\"78\" y1=\"136\" x2=\"74\" y2=\"154\" stroke=\"#2E3338\" stroke-width=\"6\"/><line x1=\"118\" y1=\"136\" x2=\"122\" y2=\"154\" stroke=\"#2E3338\" stroke-width=\"6\"/><path d=\"M54 154 L138 154 C144 154 148 150 150 144\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"6.5\" stroke-linecap=\"round\"/>",
  "jaateloauto": "<polygon points=\"84,84 110,84 97,50\" fill=\"#D9A35B\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><circle cx=\"97\" cy=\"46\" r=\"16\" fill=\"#E892A4\" stroke=\"#2E3338\" stroke-width=\"5\"/><circle cx=\"97\" cy=\"30\" r=\"11\" fill=\"#F2EBD9\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><path d=\"M32 84 L138 84 L166 108 L168 144 L32 144 Z\" fill=\"#F2EBD9\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><rect x=\"32\" y=\"122\" width=\"136\" height=\"22\" fill=\"#8CC4B8\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><rect x=\"46\" y=\"96\" width=\"46\" height=\"26\" rx=\"4\" fill=\"#DCEAF4\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><polygon points=\"116,94 136,94 154,112 116,112\" fill=\"#DCEAF4\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><circle cx=\"62\" cy=\"148\" r=\"17\" fill=\"#3D434A\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><circle cx=\"62\" cy=\"148\" r=\"6\" fill=\"#F2EBD9\"/><circle cx=\"140\" cy=\"148\" r=\"17\" fill=\"#3D434A\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><circle cx=\"140\" cy=\"148\" r=\"6\" fill=\"#F2EBD9\"/>",
  "liikennevalot": "<rect x=\"92\" y=\"150\" width=\"16\" height=\"34\" fill=\"#6E747A\" stroke=\"#2E3338\" stroke-width=\"5\"/><rect x=\"64\" y=\"24\" width=\"72\" height=\"132\" rx=\"16\" fill=\"#3D434A\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"100\" cy=\"52\" r=\"15\" fill=\"#D94B43\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><circle cx=\"100\" cy=\"90\" r=\"15\" fill=\"#E8BD46\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><circle cx=\"100\" cy=\"128\" r=\"15\" fill=\"#4FA362\" stroke=\"#2E3338\" stroke-width=\"4.5\"/>"
};
  const BOARD_SVGS = {
  "banaanilaiva": "<g transform=\"rotate(-8 100 110)\"><line x1=\"94\" y1=\"30\" x2=\"94\" y2=\"112\" stroke=\"#6E4E37\" stroke-width=\"8\" stroke-linecap=\"round\"/><path d=\"M96 36 L146 54 L96 76 Z\" fill=\"#F2EBD9\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M28 104 L164 104 C154 140 132 152 96 152 C60 152 38 140 28 104 Z\" fill=\"#9E6A44\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M40 122 L152 122\" stroke=\"#784E30\" stroke-width=\"5\"/></g><path d=\"M136 146 C152 152 170 144 176 128 C164 138 150 140 138 136 Z\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><path d=\"M24 156 C38 164 56 158 64 146 C50 152 38 152 28 148 Z\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/>",
  "triceratops": "<ellipse cx=\"106\" cy=\"124\" rx=\"44\" ry=\"32\" fill=\"#7FA87E\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"66\" cy=\"96\" r=\"28\" fill=\"#7FA87E\" stroke=\"#2E3338\" stroke-width=\"6\"/><path d=\"M46 102 L26 112 C28 124 44 128 60 120 Z\" fill=\"#B84B4B\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><circle cx=\"58\" cy=\"88\" r=\"4\" fill=\"#2E3338\"/><polygon points=\"74,70 86,52 92,74\" fill=\"#EDE6D3\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><polygon points=\"54,70 50,52 66,68\" fill=\"#EDE6D3\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><path d=\"M30 156 C44 164 60 160 68 148\" fill=\"none\" stroke=\"#F0C946\" stroke-width=\"8\" stroke-linecap=\"round\"/>",
  "aarrearkku": "<path d=\"M40 86 C44 54 156 54 160 86 Z\" fill=\"#9E6A44\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><rect x=\"44\" y=\"86\" width=\"112\" height=\"16\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"5\"/><rect x=\"38\" y=\"98\" width=\"124\" height=\"62\" rx=\"8\" fill=\"#8C5937\" stroke=\"#2E3338\" stroke-width=\"6\"/><line x1=\"68\" y1=\"98\" x2=\"68\" y2=\"160\" stroke=\"#D9A738\" stroke-width=\"8\"/><line x1=\"132\" y1=\"98\" x2=\"132\" y2=\"160\" stroke=\"#D9A738\" stroke-width=\"8\"/><rect x=\"90\" y=\"94\" width=\"20\" height=\"22\" rx=\"4\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"5\"/><circle cx=\"100\" cy=\"105\" r=\"3\" fill=\"#2E3338\"/>",
  "linna-idle": "<rect x=\"30\" y=\"88\" width=\"34\" height=\"90\" fill=\"#C9C3B8\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><polygon points=\"24,88 47,48 70,88\" fill=\"#5D748A\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><rect x=\"136\" y=\"88\" width=\"34\" height=\"90\" fill=\"#C9C3B8\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><polygon points=\"130,88 153,48 176,88\" fill=\"#5D748A\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><rect x=\"76\" y=\"58\" width=\"48\" height=\"120\" fill=\"#DDD7CC\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><polygon points=\"70,58 100,16 130,58\" fill=\"#5D748A\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><rect x=\"52\" y=\"106\" width=\"96\" height=\"72\" fill=\"#D6D0C5\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><path d=\"M52 106 L64 106 L64 96 L78 96 L78 106 L92 106 L92 96 L108 96 L108 106 L122 106 L122 96 L136 96 L136 106 L148 106\" fill=\"#D6D0C5\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M84 178 L84 142 C84 128 116 128 116 142 L116 178 Z\" fill=\"#7D5438\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><rect x=\"92\" y=\"72\" width=\"16\" height=\"20\" rx=\"8\" fill=\"#46525E\" stroke=\"#2E3338\" stroke-width=\"4\"/><rect x=\"41\" y=\"108\" width=\"12\" height=\"18\" rx=\"6\" fill=\"#46525E\" stroke=\"#2E3338\" stroke-width=\"4\"/><rect x=\"147\" y=\"108\" width=\"12\" height=\"18\" rx=\"6\" fill=\"#46525E\" stroke=\"#2E3338\" stroke-width=\"4\"/>",
  "linna-win": "<line x1=\"100\" y1=\"20\" x2=\"100\" y2=\"2\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linecap=\"round\"/><path d=\"M100 4 L138 11 L100 20 Z\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"4\" stroke-linejoin=\"round\"/><rect x=\"30\" y=\"88\" width=\"34\" height=\"90\" fill=\"#C9C3B8\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><polygon points=\"24,88 47,48 70,88\" fill=\"#5D748A\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><rect x=\"136\" y=\"88\" width=\"34\" height=\"90\" fill=\"#C9C3B8\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><polygon points=\"130,88 153,48 176,88\" fill=\"#5D748A\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><rect x=\"76\" y=\"58\" width=\"48\" height=\"120\" fill=\"#DDD7CC\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><polygon points=\"70,58 100,16 130,58\" fill=\"#5D748A\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><rect x=\"52\" y=\"106\" width=\"96\" height=\"72\" fill=\"#D6D0C5\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><path d=\"M52 106 L64 106 L64 96 L78 96 L78 106 L92 106 L92 96 L108 96 L108 106 L122 106 L122 96 L136 96 L136 106 L148 106\" fill=\"#D6D0C5\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><path d=\"M84 178 L84 142 C84 128 116 128 116 142 L116 178 Z\" fill=\"#F2BE4B\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><rect x=\"92\" y=\"72\" width=\"16\" height=\"20\" rx=\"8\" fill=\"#F5C44E\" stroke=\"#2E3338\" stroke-width=\"4\"/><rect x=\"41\" y=\"108\" width=\"12\" height=\"18\" rx=\"6\" fill=\"#F5C44E\" stroke=\"#2E3338\" stroke-width=\"4\"/><rect x=\"147\" y=\"108\" width=\"12\" height=\"18\" rx=\"6\" fill=\"#F5C44E\" stroke=\"#2E3338\" stroke-width=\"4\"/>",
  "taikavuori": "<polygon points=\"20,170 96,46 180,170\" fill=\"#8C8378\" stroke=\"#2E3338\" stroke-width=\"6.5\" stroke-linejoin=\"round\"/><polygon points=\"72,86 96,46 122,86 108,78 96,90 84,78\" fill=\"#EDEAE2\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linejoin=\"round\"/><line x1=\"94\" y1=\"96\" x2=\"118\" y2=\"44\" stroke=\"#7D5438\" stroke-width=\"8\" stroke-linecap=\"round\"/><polygon points=\"122,22 128,36 144,38 132,48 136,64 122,55 108,64 112,48 100,38 116,36\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"4\" stroke-linejoin=\"round\"/>",
  "laava": "<rect x=\"0\" y=\"0\" width=\"200\" height=\"200\" fill=\"#F5D3A8\" opacity=\"0.55\"/><path d=\"M0 112 Q50 84 100 112 T200 112 L200 200 L0 200 Z\" fill=\"#E37C58\"/><path d=\"M0 132 Q50 108 100 132 T200 132 L200 200 L0 200 Z\" fill=\"#F0A756\"/><ellipse cx=\"52\" cy=\"108\" rx=\"26\" ry=\"15\" fill=\"#6F767E\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><ellipse cx=\"106\" cy=\"84\" rx=\"26\" ry=\"15\" fill=\"#7D848D\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><ellipse cx=\"152\" cy=\"116\" rx=\"25\" ry=\"14\" fill=\"#6F767E\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><circle cx=\"72\" cy=\"158\" r=\"8\" fill=\"#F8D872\"/><circle cx=\"132\" cy=\"166\" r=\"6\" fill=\"#F8D872\"/>",
  "katapultti": "<line x1=\"68\" y1=\"138\" x2=\"146\" y2=\"62\" stroke=\"#8C5937\" stroke-width=\"11\" stroke-linecap=\"round\"/><line x1=\"68\" y1=\"138\" x2=\"146\" y2=\"62\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linecap=\"round\"/><path d=\"M134 50 C148 40 166 54 156 70 Z\" fill=\"#8C5937\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><path d=\"M126 52 C136 62 152 54 154 38 C144 46 136 48 128 46 Z\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"4.5\" stroke-linejoin=\"round\"/><polygon points=\"56,144 96,94 116,144\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"7\" stroke-linejoin=\"round\"/><rect x=\"34\" y=\"138\" width=\"128\" height=\"18\" rx=\"6\" fill=\"#9E6A44\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"56\" cy=\"158\" r=\"16\" fill=\"#6E4B32\" stroke=\"#2E3338\" stroke-width=\"5.5\"/><circle cx=\"140\" cy=\"158\" r=\"16\" fill=\"#6E4B32\" stroke=\"#2E3338\" stroke-width=\"5.5\"/>",
  "merirosvo": "<circle cx=\"100\" cy=\"108\" r=\"40\" fill=\"#EBC5A2\" stroke=\"#2E3338\" stroke-width=\"6\"/><path d=\"M46 80 C62 46 138 46 154 80 L142 86 L58 86 Z\" fill=\"#3B424A\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><rect x=\"56\" y=\"76\" width=\"88\" height=\"12\" fill=\"#C94B43\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><circle cx=\"80\" cy=\"112\" r=\"20\" fill=\"#46525E\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"120\" cy=\"112\" r=\"20\" fill=\"#46525E\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"80\" cy=\"112\" r=\"11\" fill=\"#8FBAD6\"/><circle cx=\"120\" cy=\"112\" r=\"11\" fill=\"#8FBAD6\"/><rect x=\"94\" y=\"106\" width=\"12\" height=\"10\" fill=\"#2E3338\"/><path d=\"M84 140 Q100 150 116 140\" fill=\"none\" stroke=\"#2E3338\" stroke-width=\"5\" stroke-linecap=\"round\"/>",
  "taikapata": "<circle cx=\"84\" cy=\"56\" r=\"12\" fill=\"#7AB8B5\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><circle cx=\"114\" cy=\"42\" r=\"15\" fill=\"#9D85C4\" stroke=\"#2E3338\" stroke-width=\"4.5\"/><circle cx=\"128\" cy=\"68\" r=\"9\" fill=\"#7AB8B5\" stroke=\"#2E3338\" stroke-width=\"4\"/><ellipse cx=\"100\" cy=\"124\" rx=\"58\" ry=\"44\" fill=\"#3F454D\" stroke=\"#2E3338\" stroke-width=\"6\"/><rect x=\"44\" y=\"80\" width=\"112\" height=\"18\" rx=\"9\" fill=\"#525A63\" stroke=\"#2E3338\" stroke-width=\"6\"/><ellipse cx=\"100\" cy=\"84\" rx=\"42\" ry=\"7\" fill=\"#7AB8B5\"/><path d=\"M64 162 L54 176 M136 162 L146 176\" stroke=\"#2E3338\" stroke-width=\"8\" stroke-linecap=\"round\"/>",
  "banaaninkuori": "<path d=\"M100 54 C96 96 64 132 32 138 C52 156 84 150 102 126 C120 150 152 156 170 136 C138 130 106 96 102 54 Z\" fill=\"#F0C946\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M100 58 C100 104 92 142 74 158 C94 164 114 160 124 144 C108 134 104 98 100 58 Z\" fill=\"#E3B332\" stroke=\"#2E3338\" stroke-width=\"5.5\" stroke-linejoin=\"round\"/><rect x=\"94\" y=\"42\" width=\"12\" height=\"16\" rx=\"3\" fill=\"#6E4E37\" stroke=\"#2E3338\" stroke-width=\"5\"/>",
  "taikaportti": "<path d=\"M44 170 L44 96 C44 50 156 50 156 96 L156 170 L132 170 L132 100 C132 76 68 76 68 100 L68 170 Z\" fill=\"#B8B2A6\" stroke=\"#2E3338\" stroke-width=\"6\" stroke-linejoin=\"round\"/><path d=\"M68 170 L68 100 C68 76 132 76 132 100 L132 170 Z\" fill=\"#5B6CA8\" stroke=\"#2E3338\" stroke-width=\"5\"/><circle cx=\"100\" cy=\"116\" r=\"18\" fill=\"none\" stroke=\"#F2D06B\" stroke-width=\"5\" stroke-dasharray=\"14 8\"/><polygon points=\"100,96 104,108 116,112 104,116 100,128 96,116 84,112 96,108\" fill=\"#F2D06B\"/>",
  "karhu-0": "<circle cx=\"62\" cy=\"52\" r=\"16\" fill=\"#68635E\" stroke=\"#3D3834\" stroke-width=\"5\"/><circle cx=\"138\" cy=\"52\" r=\"16\" fill=\"#68635E\" stroke=\"#3D3834\" stroke-width=\"5\"/><circle cx=\"100\" cy=\"80\" r=\"42\" fill=\"#68635E\" stroke=\"#3D3834\" stroke-width=\"5.5\"/><ellipse cx=\"100\" cy=\"94\" rx=\"20\" ry=\"15\" fill=\"#9E978E\" stroke=\"#3D3834\" stroke-width=\"4.5\"/><ellipse cx=\"100\" cy=\"88\" rx=\"8\" ry=\"6\" fill=\"#3D3834\"/><circle cx=\"84\" cy=\"72\" r=\"4.5\" fill=\"#FAF8F3\"/><circle cx=\"116\" cy=\"72\" r=\"4.5\" fill=\"#FAF8F3\"/><ellipse cx=\"100\" cy=\"146\" rx=\"46\" ry=\"34\" fill=\"#68635E\" stroke=\"#3D3834\" stroke-width=\"5.5\"/><path d=\"M74 142 C96 154 134 142 146 112 L134 108 C124 132 98 138 78 130 Z\" fill=\"#F0C946\" stroke=\"#3D3834\" stroke-width=\"5\" stroke-linejoin=\"round\"/><circle cx=\"72\" cy=\"138\" r=\"13\" fill=\"#7D7770\" stroke=\"#3D3834\" stroke-width=\"5\"/><circle cx=\"128\" cy=\"138\" r=\"13\" fill=\"#7D7770\" stroke=\"#3D3834\" stroke-width=\"5\"/>",
  "karhu-win": "<circle cx=\"64\" cy=\"48\" r=\"16\" fill=\"#68635E\" stroke=\"#3D3834\" stroke-width=\"5.5\"/><circle cx=\"136\" cy=\"48\" r=\"16\" fill=\"#68635E\" stroke=\"#3D3834\" stroke-width=\"5.5\"/><ellipse cx=\"100\" cy=\"136\" rx=\"50\" ry=\"44\" fill=\"#68635E\" stroke=\"#3D3834\" stroke-width=\"6\"/><circle cx=\"100\" cy=\"76\" r=\"42\" fill=\"#68635E\" stroke=\"#3D3834\" stroke-width=\"6\"/><ellipse cx=\"100\" cy=\"90\" rx=\"20\" ry=\"15\" fill=\"#9E978E\" stroke=\"#3D3834\" stroke-width=\"4.5\"/><ellipse cx=\"100\" cy=\"84\" rx=\"8\" ry=\"6\" fill=\"#3D3834\"/><circle cx=\"84\" cy=\"68\" r=\"4\" fill=\"#FAF8F3\"/><circle cx=\"116\" cy=\"68\" r=\"4\" fill=\"#FAF8F3\"/><path d=\"M128 118 C148 124 168 110 172 86 L160 86 C156 102 142 110 128 108 Z\" fill=\"#F0C946\" stroke=\"#3D3834\" stroke-width=\"5\" stroke-linejoin=\"round\"/>",
  "karhu-token": "<circle cx=\"56\" cy=\"58\" r=\"24\" fill=\"#9B8A79\" stroke=\"#2E3338\" stroke-width=\"7\"/><circle cx=\"144\" cy=\"58\" r=\"24\" fill=\"#9B8A79\" stroke=\"#2E3338\" stroke-width=\"7\"/><circle cx=\"100\" cy=\"106\" r=\"62\" fill=\"#9B8A79\" stroke=\"#2E3338\" stroke-width=\"7\"/><ellipse cx=\"100\" cy=\"122\" rx=\"28\" ry=\"20\" fill=\"#D4C4B2\" stroke=\"#2E3338\" stroke-width=\"5\"/><ellipse cx=\"100\" cy=\"114\" rx=\"11\" ry=\"8\" fill=\"#2E3338\"/><circle cx=\"76\" cy=\"96\" r=\"6.5\" fill=\"#2E3338\"/><circle cx=\"124\" cy=\"96\" r=\"6.5\" fill=\"#2E3338\"/>",
  "karhu-tassu": "<circle cx=\"48\" cy=\"64\" r=\"18\" fill=\"#5A5550\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"84\" cy=\"46\" r=\"19\" fill=\"#5A5550\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"122\" cy=\"48\" r=\"19\" fill=\"#5A5550\" stroke=\"#2E3338\" stroke-width=\"6\"/><circle cx=\"156\" cy=\"72\" r=\"17\" fill=\"#5A5550\" stroke=\"#2E3338\" stroke-width=\"6\"/><path d=\"M54 134 C54 92 146 92 146 134 C146 164 122 174 100 174 C78 174 54 164 54 134 Z\" fill=\"#5A5550\" stroke=\"#2E3338\" stroke-width=\"6\"/>",
  "accent-grass": "<path d=\"M62 152 Q52 104 38 82 Q68 104 82 148 M98 152 Q98 92 104 62 Q112 96 112 152 M122 150 Q140 106 160 88 Q144 120 134 152\" fill=\"none\" stroke=\"#7FA37A\" stroke-width=\"10\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "accent-pebbles": "<ellipse cx=\"76\" cy=\"130\" rx=\"34\" ry=\"20\" fill=\"#CFC8BA\" stroke=\"#6D6962\" stroke-width=\"6\"/><ellipse cx=\"134\" cy=\"136\" rx=\"26\" ry=\"15\" fill=\"#DFD9CC\" stroke=\"#6D6962\" stroke-width=\"6\"/><ellipse cx=\"112\" cy=\"104\" rx=\"20\" ry=\"12\" fill=\"#C4BDB0\" stroke=\"#6D6962\" stroke-width=\"6\"/>",
  "accent-bush": "<path d=\"M38 148 C30 118 52 94 78 98 C86 72 126 70 136 98 C162 96 176 122 162 148 Z\" fill=\"#94B58D\" stroke=\"#4A5848\" stroke-width=\"6\" stroke-linejoin=\"round\"/>",
  "accent-flower": "<path d=\"M74 152 Q66 112 54 96 M100 152 Q100 106 104 82 M126 152 Q138 114 150 100\" fill=\"none\" stroke=\"#7FA37A\" stroke-width=\"9\" stroke-linecap=\"round\"/><circle cx=\"104\" cy=\"74\" r=\"13\" fill=\"#F0C946\" stroke=\"#5E5B52\" stroke-width=\"5\"/>"
};

  const resolved = new Map();
  const decodedCache = new Map();
  let preloadPromise = null;
  let preloaded = false;

  function probeUrl(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.decoding = 'sync';
      img.onload = () => {
        const done = () => resolve({ url, img });
        if (typeof img.decode === 'function') {
          img.decode().then(done).catch(done);
        } else {
          done();
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function resolveAsset(folder, id) {
    const key = `${folder}/${id}`;
    if (resolved.has(key)) return resolved.get(key);

    const webp = await probeUrl(`./img/${folder}/${id}.webp`);
    if (webp) {
      resolved.set(key, webp.url);
      decodedCache.set(key, webp.img);
      return webp.url;
    }
    const png = await probeUrl(`./img/${folder}/${id}.png`);
    if (png) {
      resolved.set(key, png.url);
      decodedCache.set(key, png.img);
      return png.url;
    }
    resolved.set(key, null);
    return null;
  }

  function preloadAll() {
    if (preloadPromise) return preloadPromise;
    const jobs = [];
    Object.keys(BOARD_SVGS).forEach(id => jobs.push(resolveAsset('board', id)));
    (window.TAVUPELI_WORDS || []).forEach(w => jobs.push(resolveAsset('words', w.id)));
    preloadPromise = Promise.all(jobs).then(res => {
      preloaded = true;
      return res;
    });
    return preloadPromise;
  }

  function isPreloaded() {
    return preloaded;
  }

  function getResolvedUrl(folder, id) {
    return resolved.get(`${folder}/${id}`) || null;
  }

  function getFallbackInner(folder, id) {
    const map = folder === 'words' ? WORD_SVGS : BOARD_SVGS;
    return map[id] || '<circle cx="100" cy="100" r="60" fill="#E8E4DA" stroke="#2E3338" stroke-width="6"/>';
  }

  function getSvgMarkup(folder, id, extraClass = '') {
    const cls = extraClass ? ` class="${extraClass}"` : '';
    return `<svg${cls} viewBox="0 0 200 200" aria-hidden="true">${getFallbackInner(folder, id)}</svg>`;
  }

  function renderHtml(container, folder, id, alt = '') {
    const key = `${folder}/${id}`;
    const url = resolved.get(key) || null;
    if (url) {
      const cached = decodedCache.get(key);
      const img = cached ? cached.cloneNode(false) : new Image();
      img.src = url;
      img.alt = alt;
      img.draggable = false;
      img.decoding = 'sync';
      container.innerHTML = '';
      container.appendChild(img);
    } else {
      container.innerHTML = getSvgMarkup(folder, id);
    }
  }

  function buildBoardSvgNode(id, x, y, w, h, cls = '', transformAttr = '') {
    const url = getResolvedUrl('board', id);
    const tAttr = transformAttr ? ` transform="${transformAttr}"` : '';
    const classAttr = cls ? ` class="${cls}"` : '';
    if (url) {
      return `<image${classAttr} href="${url}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"${tAttr} />`;
    }
    return `<svg${classAttr} x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet"${tAttr}>${getFallbackInner('board', id)}</svg>`;
  }

  // Bear token on board (uses img/board/karhu-token.webp if available, else SVG fallback)
  function getBearTokenSvg() {
    const url = getResolvedUrl('board', 'karhu-token');
    if (url) {
      return `
        <ellipse cx="0" cy="17" rx="16" ry="4.8" fill="rgba(46,42,38,0.22)" />
        <image href="${url}" x="-20" y="-22" width="40" height="40" preserveAspectRatio="xMidYMid meet" />
      `;
    }
    return `
      <ellipse cx="0" cy="16" rx="15.5" ry="4.5" fill="rgba(61,56,52,0.22)" />
      <circle cx="-11" cy="-13" r="6" fill="#68635E" stroke="#FAF8F3" stroke-width="2" />
      <circle cx="11" cy="-13" r="6" fill="#68635E" stroke="#FAF8F3" stroke-width="2" />
      <ellipse cx="0" cy="5.5" rx="14.5" ry="11.5" fill="#68635E" stroke="#FAF8F3" stroke-width="2.2" />
      <circle cx="0" cy="-2.5" r="15.5" fill="#68635E" stroke="#FAF8F3" stroke-width="2.4" />
      <circle cx="-11" cy="-13" r="4.6" fill="#68635E" />
      <circle cx="11" cy="-13" r="4.6" fill="#68635E" />
      <ellipse cx="0" cy="1.8" rx="6.5" ry="4.6" fill="#9E978E" />
      <ellipse cx="0" cy="0.2" rx="2.8" ry="1.8" fill="#3D3834" />
      <circle cx="-5.5" cy="-4.5" r="1.9" fill="#FAF8F3" />
      <circle cx="5.5" cy="-4.5" r="1.9" fill="#FAF8F3" />
    `;
  }

  // Bear paw print for Bear cards (uses img/board/karhu-tassu.webp if available, else SVG fallback)
  function getPawPrintSvg() {
    const url = getResolvedUrl('board', 'karhu-tassu');
    if (url) {
      return `<img class="bear-paw" src="${url}" alt="" draggable="false" decoding="sync" />`;
    }
    return `
      <svg class="bear-paw" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="15" cy="18" r="6.5" fill="#5A5550" />
        <circle cx="28" cy="12" r="7" fill="#5A5550" />
        <circle cx="41" cy="14" r="7" fill="#5A5550" />
        <circle cx="51" cy="24" r="6" fill="#5A5550" />
        <path d="M18 42 C18 28 46 28 46 42 C46 52 38 56 32 56 C26 56 18 52 18 42 Z" fill="#5A5550" />
      </svg>
    `;
  }

  return {
    preloadAll,
    isPreloaded,
    resolveAsset,
    getResolvedUrl,
    getSvgMarkup,
    renderHtml,
    buildBoardSvgNode,
    getBearTokenSvg,
    getPawPrintSvg,
    WORD_IDS: Object.keys(WORD_SVGS),
    BOARD_IDS: Object.keys(BOARD_SVGS)
  };
})();
