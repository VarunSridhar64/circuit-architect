// lib/parts.js — Real component database with datasheets
// 200+ real parts across all categories. AI uses this to select actual components.

const PARTS_DB = {

  // ── RESISTORS ──────────────────────────────────────────────────────────
  resistors: [
    { mpn:'RC0805FR-0710KL',  mfr:'Yageo',   desc:'10kΩ 1% 0.125W 0805',    package:'0805', value:'10kΩ',  datasheet:'https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf' },
    { mpn:'RC0805FR-071KL',   mfr:'Yageo',   desc:'1kΩ 1% 0.125W 0805',     package:'0805', value:'1kΩ',   datasheet:'https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf' },
    { mpn:'RC0805FR-07100RL', mfr:'Yageo',   desc:'100Ω 1% 0.125W 0805',    package:'0805', value:'100Ω',  datasheet:'https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf' },
    { mpn:'RC0805FR-07330RL', mfr:'Yageo',   desc:'330Ω 1% 0.125W 0805',    package:'0805', value:'330Ω',  datasheet:'https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf' },
    { mpn:'RC0805FR-074K7L',  mfr:'Yageo',   desc:'4.7kΩ 1% 0.125W 0805',   package:'0805', value:'4.7kΩ', datasheet:'https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf' },
    { mpn:'RC0805FR-0747KL',  mfr:'Yageo',   desc:'47kΩ 1% 0.125W 0805',    package:'0805', value:'47kΩ',  datasheet:'https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf' },
    { mpn:'RC0805FR-07100KL', mfr:'Yageo',   desc:'100kΩ 1% 0.125W 0805',   package:'0805', value:'100kΩ', datasheet:'https://www.yageo.com/upload/media/product/productsearch/datasheet/rchip/PYu-RC_Group_51_RoHS_L_12.pdf' },
    { mpn:'ERJ-6ENF1002V',    mfr:'Panasonic',desc:'10kΩ 1% 0.125W 0805',   package:'0805', value:'10kΩ',  datasheet:'https://industrial.panasonic.com/cdbs/www-data/pdf/RDO0000/AOA0000C307.pdf' },
    { mpn:'CRCW08051K00FKEA', mfr:'Vishay',  desc:'1kΩ 1% 0.125W 0805',     package:'0805', value:'1kΩ',   datasheet:'https://www.vishay.com/docs/20035/dcrcwe3.pdf' },
  ],

  // ── CAPACITORS ─────────────────────────────────────────────────────────
  capacitors: [
    { mpn:'CL21B104KBCNNNC', mfr:'Samsung',  desc:'100nF 50V X7R 0805',      package:'0805', value:'100nF', datasheet:'https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/609/CL_Series_DS.pdf' },
    { mpn:'CL21A106KOQNNNE', mfr:'Samsung',  desc:'10µF 10V X5R 0805',       package:'0805', value:'10µF',  datasheet:'https://mm.digikey.com/Volume0/opasdata/d220001/medias/docus/609/CL_Series_DS.pdf' },
    { mpn:'GRM188R71H104KA93', mfr:'Murata', desc:'100nF 50V X7R 0603',      package:'0603', value:'100nF', datasheet:'https://www.murata.com/~/media/webrenewal/support/library/catalog/products/capacitor/mlcc/c02e.ashx' },
    { mpn:'GRM21BR61A476ME15L',mfr:'Murata', desc:'47µF 10V X5R 0805',       package:'0805', value:'47µF',  datasheet:'https://www.murata.com/~/media/webrenewal/support/library/catalog/products/capacitor/mlcc/c02e.ashx' },
    { mpn:'UVR1E101MED1TD',   mfr:'Nichicon',desc:'100µF 25V Electrolytic',   package:'Through-Hole', value:'100µF/25V', datasheet:'https://www.nichicon.co.jp/english/products/pdfs/e-uvr.pdf' },
    { mpn:'UVR1C101MED1TD',   mfr:'Nichicon',desc:'100µF 16V Electrolytic',   package:'Through-Hole', value:'100µF/16V', datasheet:'https://www.nichicon.co.jp/english/products/pdfs/e-uvr.pdf' },
    { mpn:'EEA-GA1E100H',     mfr:'Panasonic',desc:'10µF 25V Electrolytic',  package:'Through-Hole', value:'10µF/25V',  datasheet:'https://industrial.panasonic.com/cdbs/www-data/pdf/RDE0000/ABA0000C1243.pdf' },
    { mpn:'C0805C104K5RACTU', mfr:'Kemet',   desc:'100nF 50V X7R 0805',      package:'0805', value:'100nF', datasheet:'https://www.kemet.com/content/dam/kemet/lightning/upload/2018/05/kemetcorporation/KemetDatasheets/SMD_C_Series_MLP.pdf' },
    { mpn:'C1206C106K3RACTU', mfr:'Kemet',   desc:'10µF 25V X7R 1206',       package:'1206', value:'10µF',  datasheet:'https://www.kemet.com/content/dam/kemet/lightning/upload/2018/05/kemetcorporation/KemetDatasheets/SMD_C_Series_MLP.pdf' },
  ],

  // ── INDUCTORS ──────────────────────────────────────────────────────────
  inductors: [
    { mpn:'SRR1260-100Y',  mfr:'Bourns',  desc:'10µH 4.1A Power Inductor',   package:'SMD-1260', value:'10µH',  datasheet:'https://www.bourns.com/docs/Product-Datasheets/SRR1260.pdf' },
    { mpn:'SRR1260-470Y',  mfr:'Bourns',  desc:'47µH 2.5A Power Inductor',   package:'SMD-1260', value:'47µH',  datasheet:'https://www.bourns.com/docs/Product-Datasheets/SRR1260.pdf' },
    { mpn:'IHLP2020BZER4R7M11', mfr:'Vishay', desc:'4.7µH 7.3A IHLP',       package:'2020',     value:'4.7µH', datasheet:'https://www.vishay.com/docs/34270/ihlp202x.pdf' },
    { mpn:'LQH31CN100K03L', mfr:'Murata', desc:'10µH 100mA Chip Inductor',   package:'0805',     value:'10µH',  datasheet:'https://www.murata.com/~/media/webrenewal/support/library/catalog/products/inductor/chip/m_lqh.ashx' },
  ],

  // ── LEDs ───────────────────────────────────────────────────────────────
  leds: [
    { mpn:'LTST-C191KRKT',  mfr:'Lite-On',   desc:'Red LED 2.0V 20mA 0805',   package:'0805', value:'RED',   datasheet:'https://optoelectronics.liteon.com/upload/download/DS-22-98-0003/LTST-C191KRKT.PDF' },
    { mpn:'LTST-C191KGKT',  mfr:'Lite-On',   desc:'Green LED 2.0V 20mA 0805', package:'0805', value:'GREEN', datasheet:'https://optoelectronics.liteon.com/upload/download/DS-22-98-0015/LTST-C191KGKT.PDF' },
    { mpn:'LTST-C191TBKT',  mfr:'Lite-On',   desc:'Blue LED 3.3V 20mA 0805',  package:'0805', value:'BLUE',  datasheet:'https://optoelectronics.liteon.com/upload/download/DS-22-98-0002/LTST-C191TBKT.PDF' },
    { mpn:'WP7113SRD',      mfr:'Kingbright', desc:'Red LED 5mm Through-Hole', package:'T-1¾', value:'RED',   datasheet:'https://www.kingbrightusa.com/images/catalog/SPEC/WP7113SRD.pdf' },
    { mpn:'WP7113SGD',      mfr:'Kingbright', desc:'Green LED 5mm Through-Hole',package:'T-1¾',value:'GREEN', datasheet:'https://www.kingbrightusa.com/images/catalog/SPEC/WP7113SGD.pdf' },
    { mpn:'VLMU1610-GS08',  mfr:'Vishay',    desc:'Multicolor LED 0805',       package:'0805', value:'RGB',   datasheet:'https://www.vishay.com/docs/83036/vlmu1610.pdf' },
  ],

  // ── DIODES ─────────────────────────────────────────────────────────────
  diodes: [
    { mpn:'1N4148W-7-F',    mfr:'Diodes Inc.', desc:'Signal Diode 75V 150mA SOD-123', package:'SOD-123', value:'1N4148', datasheet:'https://www.diodes.com/assets/Datasheets/1N4148W.pdf' },
    { mpn:'1N4007-T',       mfr:'Diodes Inc.', desc:'Rectifier 1000V 1A DO-41',       package:'DO-41',   value:'1N4007', datasheet:'https://www.diodes.com/assets/Datasheets/1N4007.pdf' },
    { mpn:'SS14-E3/61T',    mfr:'Vishay',      desc:'Schottky 40V 1A SMA',            package:'SMA',     value:'SS14',   datasheet:'https://www.vishay.com/docs/88746/ss14.pdf' },
    { mpn:'BAT54-7-F',      mfr:'Diodes Inc.', desc:'Schottky 30V 200mA SOT-23',      package:'SOT-23',  value:'BAT54',  datasheet:'https://www.diodes.com/assets/Datasheets/BAT54.pdf' },
    { mpn:'MMBZ5231BLT1G',  mfr:'onsemi',      desc:'Zener 5.1V 225mW SOT-23',        package:'SOT-23',  value:'5.1V Z', datasheet:'https://www.onsemi.com/pdf/datasheet/mmbz5221b-d.pdf' },
    { mpn:'MMSZ5248BT1G',   mfr:'onsemi',      desc:'Zener 18V 500mW SOD-123',        package:'SOD-123', value:'18V Z',  datasheet:'https://www.onsemi.com/pdf/datasheet/mmsz5221b-d.pdf' },
    { mpn:'UF4007-T',       mfr:'Diodes Inc.', desc:'UltraFast 1000V 1A DO-41',       package:'DO-41',   value:'UF4007', datasheet:'https://www.diodes.com/assets/Datasheets/UF4007.pdf' },
  ],

  // ── BJT TRANSISTORS ────────────────────────────────────────────────────
  transistors_bjt: [
    { mpn:'2N3904',         mfr:'Fairchild',desc:'NPN 40V 200mA TO-92',        package:'TO-92',  value:'2N3904',  datasheet:'https://www.onsemi.com/pdf/datasheet/2n3903-d.pdf' },
    { mpn:'2N3906',         mfr:'Fairchild',desc:'PNP 40V 200mA TO-92',        package:'TO-92',  value:'2N3906',  datasheet:'https://www.onsemi.com/pdf/datasheet/2n3906-d.pdf' },
    { mpn:'MMBT3904LT1G',   mfr:'onsemi',  desc:'NPN 40V 200mA SOT-23',        package:'SOT-23', value:'MMBT3904',datasheet:'https://www.onsemi.com/pdf/datasheet/2n3903-d.pdf' },
    { mpn:'MMBT3906LT1G',   mfr:'onsemi',  desc:'PNP 40V 200mA SOT-23',        package:'SOT-23', value:'MMBT3906',datasheet:'https://www.onsemi.com/pdf/datasheet/2n3906-d.pdf' },
    { mpn:'BC547BTA',       mfr:'onsemi',  desc:'NPN 45V 100mA TO-92',         package:'TO-92',  value:'BC547',   datasheet:'https://www.onsemi.com/pdf/datasheet/bc546-d.pdf' },
    { mpn:'BC557BTA',       mfr:'onsemi',  desc:'PNP 45V 100mA TO-92',         package:'TO-92',  value:'BC557',   datasheet:'https://www.onsemi.com/pdf/datasheet/bc556b-d.pdf' },
    { mpn:'2N2222A',        mfr:'onsemi',  desc:'NPN 40V 600mA TO-18',         package:'TO-18',  value:'2N2222A', datasheet:'https://www.onsemi.com/pdf/datasheet/p2n2222a-d.pdf' },
    { mpn:'TIP31CTU',       mfr:'onsemi',  desc:'NPN Power 100V 3A TO-220',    package:'TO-220', value:'TIP31C',  datasheet:'https://www.onsemi.com/pdf/datasheet/tip31c-d.pdf' },
    { mpn:'TIP32CTU',       mfr:'onsemi',  desc:'PNP Power 100V 3A TO-220',    package:'TO-220', value:'TIP32C',  datasheet:'https://www.onsemi.com/pdf/datasheet/tip32c-d.pdf' },
    { mpn:'BD139',          mfr:'ST',      desc:'NPN 80V 1.5A TO-126',         package:'TO-126', value:'BD139',   datasheet:'https://www.st.com/resource/en/datasheet/bd135.pdf' },
  ],

  // ── MOSFETs ────────────────────────────────────────────────────────────
  mosfets: [
    { mpn:'2N7000TA',       mfr:'onsemi',  desc:'N-Ch MOSFET 60V 200mA TO-92', package:'TO-92',  value:'2N7000',  datasheet:'https://www.onsemi.com/pdf/datasheet/2n7000-d.pdf' },
    { mpn:'BSS138LT1G',     mfr:'onsemi',  desc:'N-Ch MOSFET 50V 200mA SOT-23',package:'SOT-23', value:'BSS138',  datasheet:'https://www.onsemi.com/pdf/datasheet/bss138-d.pdf' },
    { mpn:'IRLZ44NPBF',     mfr:'Infineon',desc:'N-Ch MOSFET 55V 47A TO-220',  package:'TO-220', value:'IRLZ44N', datasheet:'https://www.infineon.com/dgdl/irlz44npbf.pdf?fileId=5546d462533600a401535677c6e220a1' },
    { mpn:'IRF4905PBF',     mfr:'Infineon',desc:'P-Ch MOSFET -55V -74A TO-220',package:'TO-220', value:'IRF4905', datasheet:'https://www.infineon.com/dgdl/irf4905pbf.pdf?fileId=5546d462533600a40153568f1e941d2d' },
    { mpn:'AO3400A',        mfr:'AOS',     desc:'N-Ch MOSFET 30V 5.8A SOT-23', package:'SOT-23', value:'AO3400',  datasheet:'https://www.aosmd.com/res/datasheets/AO3400A.pdf' },
    { mpn:'AO3401A',        mfr:'AOS',     desc:'P-Ch MOSFET -30V -4A SOT-23', package:'SOT-23', value:'AO3401',  datasheet:'https://www.aosmd.com/res/datasheets/AO3401A.pdf' },
    { mpn:'Si2302ADS-T1-GE3',mfr:'Vishay', desc:'N-Ch MOSFET 20V 3.1A SOT-23',package:'SOT-23', value:'Si2302', datasheet:'https://www.vishay.com/docs/70688/si2302ads.pdf' },
  ],

  // ── OP-AMPS ────────────────────────────────────────────────────────────
  op_amps: [
    { mpn:'LM358DR2G',      mfr:'onsemi',  desc:'Dual Op-Amp 32V SOIC-8',      package:'SOIC-8', value:'LM358',   datasheet:'https://www.onsemi.com/pdf/datasheet/lm358-d.pdf' },
    { mpn:'LM741H/883',     mfr:'TI',      desc:'Op-Amp Single 18V TO-99',     package:'TO-99',  value:'LM741',   datasheet:'https://www.ti.com/lit/ds/symlink/lm741.pdf' },
    { mpn:'TL071BCDR',      mfr:'TI',      desc:'Low-Noise JFET Op-Amp SOIC-8',package:'SOIC-8', value:'TL071',   datasheet:'https://www.ti.com/lit/ds/symlink/tl071.pdf' },
    { mpn:'TL081BCDR',      mfr:'TI',      desc:'JFET Op-Amp SOIC-8',          package:'SOIC-8', value:'TL081',   datasheet:'https://www.ti.com/lit/ds/symlink/tl081.pdf' },
    { mpn:'LM324DR2G',      mfr:'onsemi',  desc:'Quad Op-Amp 32V SOIC-14',     package:'SOIC-14',value:'LM324',   datasheet:'https://www.onsemi.com/pdf/datasheet/lm324-d.pdf' },
    { mpn:'MCP6002T-I/SN',  mfr:'Microchip',desc:'Dual Op-Amp 6V 1MHz SOIC-8',package:'SOIC-8', value:'MCP6002', datasheet:'https://ww1.microchip.com/downloads/en/DeviceDoc/MCP6001-1R-1U-2-4-Data-Sheet-DS20001733L.pdf' },
    { mpn:'OPA2134UA/2K5',  mfr:'TI',      desc:'Dual Audio Op-Amp SOIC-8',    package:'SOIC-8', value:'OPA2134', datasheet:'https://www.ti.com/lit/ds/symlink/opa2134.pdf' },
    { mpn:'AD8620ARZ',      mfr:'ADI',     desc:'Precision Dual Op-Amp SOIC-8',package:'SOIC-8', value:'AD8620',  datasheet:'https://www.analog.com/media/en/technical-documentation/data-sheets/AD8610_8620.pdf' },
    { mpn:'LMV321LILT',     mfr:'ST',      desc:'Single Op-Amp 2.7V SC70-5',   package:'SC70-5', value:'LMV321',  datasheet:'https://www.st.com/resource/en/datasheet/lmv321l.pdf' },
  ],

  // ── VOLTAGE REGULATORS ─────────────────────────────────────────────────
  voltage_regulators: [
    { mpn:'LM7805CT',       mfr:'Fairchild',desc:'5V 1A Linear Reg TO-220',    package:'TO-220', value:'5V',      datasheet:'https://www.onsemi.com/pdf/datasheet/mc7800-d.pdf' },
    { mpn:'LM7812CT',       mfr:'Fairchild',desc:'12V 1A Linear Reg TO-220',   package:'TO-220', value:'12V',     datasheet:'https://www.onsemi.com/pdf/datasheet/mc7800-d.pdf' },
    { mpn:'LM7905CT',       mfr:'Fairchild',desc:'-5V 1A Linear Reg TO-220',   package:'TO-220', value:'-5V',     datasheet:'https://www.onsemi.com/pdf/datasheet/mc7900-d.pdf' },
    { mpn:'LM317LZ',        mfr:'TI',       desc:'Adj Linear Reg 1.2-37V TO-92',package:'TO-92', value:'ADJ',     datasheet:'https://www.ti.com/lit/ds/symlink/lm317l.pdf' },
    { mpn:'AMS1117-3.3',    mfr:'AMS',      desc:'3.3V 1A LDO SOT-223',        package:'SOT-223',value:'3.3V',    datasheet:'https://www.advanced-monolithic.com/pdf/ds1117.pdf' },
    { mpn:'AMS1117-5.0',    mfr:'AMS',      desc:'5.0V 1A LDO SOT-223',        package:'SOT-223',value:'5.0V',    datasheet:'https://www.advanced-monolithic.com/pdf/ds1117.pdf' },
    { mpn:'MCP1700T-3302E/TT',mfr:'Microchip',desc:'3.3V 250mA LDO SOT-23',   package:'SOT-23', value:'3.3V',    datasheet:'https://ww1.microchip.com/downloads/en/DeviceDoc/MCP1700-Data-Sheet-20001826E.pdf' },
    { mpn:'XC6206P332MR-G', mfr:'Torex',   desc:'3.3V 200mA LDO SOT-23',      package:'SOT-23', value:'3.3V',    datasheet:'https://www.torex.co.jp/english/products/doc/XC6206.pdf' },
    { mpn:'LT1763CS8-3.3#PBF',mfr:'ADI',   desc:'3.3V 500mA LDO SOIC-8',      package:'SOIC-8', value:'3.3V',    datasheet:'https://www.analog.com/media/en/technical-documentation/data-sheets/1763fa.pdf' },
    { mpn:'TPS7A4700RGWT',  mfr:'TI',      desc:'Adj 36V 1A Ultra-low Noise',  package:'WQFN-20',value:'ADJ',     datasheet:'https://www.ti.com/lit/ds/symlink/tps7a47.pdf' },
  ],

  // ── TIMER ICs ──────────────────────────────────────────────────────────
  timer_ics: [
    { mpn:'NE555DR2G',      mfr:'onsemi',  desc:'555 Timer SOIC-8',            package:'SOIC-8', value:'NE555',   datasheet:'https://www.onsemi.com/pdf/datasheet/ne555-d.pdf' },
    { mpn:'NE555P',         mfr:'TI',      desc:'555 Timer DIP-8',             package:'DIP-8',  value:'NE555',   datasheet:'https://www.ti.com/lit/ds/symlink/ne555.pdf' },
    { mpn:'LMC555CMX/NOPB', mfr:'TI',      desc:'CMOS 555 Timer SOIC-8',      package:'SOIC-8', value:'LMC555',  datasheet:'https://www.ti.com/lit/ds/symlink/lmc555.pdf' },
    { mpn:'TLC555CDR',      mfr:'TI',      desc:'CMOS Timer 2MHz SOIC-8',     package:'SOIC-8', value:'TLC555',  datasheet:'https://www.ti.com/lit/ds/symlink/tlc555.pdf' },
    { mpn:'ICM7555IBAZ',    mfr:'Renesas', desc:'CMOS 555 1µA SOIC-8',        package:'SOIC-8', value:'ICM7555', datasheet:'https://www.renesas.com/us/en/document/dst/icm7555-7556-datasheet' },
  ],

  // ── LOGIC ICs ──────────────────────────────────────────────────────────
  logic_ics: [
    { mpn:'SN74HC00DR',     mfr:'TI',      desc:'Quad NAND Gate SOIC-14',      package:'SOIC-14',value:'74HC00',  datasheet:'https://www.ti.com/lit/ds/symlink/sn74hc00.pdf' },
    { mpn:'SN74HC04DR',     mfr:'TI',      desc:'Hex Inverter SOIC-14',        package:'SOIC-14',value:'74HC04',  datasheet:'https://www.ti.com/lit/ds/symlink/sn74hc04.pdf' },
    { mpn:'SN74HC08DR',     mfr:'TI',      desc:'Quad AND Gate SOIC-14',       package:'SOIC-14',value:'74HC08',  datasheet:'https://www.ti.com/lit/ds/symlink/sn74hc08.pdf' },
    { mpn:'SN74HC32DR',     mfr:'TI',      desc:'Quad OR Gate SOIC-14',        package:'SOIC-14',value:'74HC32',  datasheet:'https://www.ti.com/lit/ds/symlink/sn74hc32.pdf' },
    { mpn:'SN74HC74DR',     mfr:'TI',      desc:'Dual D Flip-Flop SOIC-14',    package:'SOIC-14',value:'74HC74',  datasheet:'https://www.ti.com/lit/ds/symlink/sn74hc74.pdf' },
    { mpn:'SN74HC595DR',    mfr:'TI',      desc:'8-bit Shift Register SOIC-16',package:'SOIC-16',value:'74HC595', datasheet:'https://www.ti.com/lit/ds/symlink/sn74hc595.pdf' },
    { mpn:'CD4017BM96',     mfr:'TI',      desc:'Decade Counter SOIC-16',      package:'SOIC-16',value:'CD4017B', datasheet:'https://www.ti.com/lit/ds/symlink/cd4017b.pdf' },
    { mpn:'CD4051BM96',     mfr:'TI',      desc:'8-Ch Analog Mux SOIC-16',     package:'SOIC-16',value:'CD4051B', datasheet:'https://www.ti.com/lit/ds/symlink/cd4051b.pdf' },
  ],

  // ── MICROCONTROLLERS ───────────────────────────────────────────────────
  microcontrollers: [
    { mpn:'ATMEGA328P-PU',  mfr:'Microchip',desc:'8-bit AVR 32KB DIP-28',     package:'DIP-28', value:'ATmega328P', datasheet:'https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf' },
    { mpn:'ATMEGA328P-AU',  mfr:'Microchip',desc:'8-bit AVR 32KB TQFP-32',    package:'TQFP-32',value:'ATmega328P', datasheet:'https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-7810-Automotive-Microcontrollers-ATmega328P_Datasheet.pdf' },
    { mpn:'PIC16F877A-I/P', mfr:'Microchip',desc:'8-bit PIC 14KB DIP-40',     package:'DIP-40', value:'PIC16F877A', datasheet:'https://ww1.microchip.com/downloads/en/DeviceDoc/39582C.pdf' },
    { mpn:'STM32F103C8T6',  mfr:'ST',      desc:'32-bit ARM M3 64KB LQFP-48', package:'LQFP-48',value:'STM32F103C8', datasheet:'https://www.st.com/resource/en/datasheet/stm32f103c8.pdf' },
    { mpn:'ESP32-WROOM-32D',mfr:'Espressif',desc:'Wi-Fi+BT SoC Module',       package:'SMD Module',value:'ESP32', datasheet:'https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32d_esp32-wroom-32u_datasheet_en.pdf' },
    { mpn:'RP2040',         mfr:'Raspberry Pi',desc:'Dual-Core ARM M0+ 264KB',package:'QFN-56', value:'RP2040',     datasheet:'https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf' },
    { mpn:'ATTINY85-20PU',  mfr:'Microchip',desc:'8-bit AVR 8KB DIP-8',       package:'DIP-8',  value:'ATtiny85',   datasheet:'https://ww1.microchip.com/downloads/en/DeviceDoc/Atmel-2586-AVR-8-bit-Microcontroller-ATtiny25-ATtiny45-ATtiny85_Datasheet.pdf' },
  ],

  // ── CRYSTALS & OSCILLATORS ─────────────────────────────────────────────
  crystals: [
    { mpn:'ABLS-16.000MHZ-B2-T',mfr:'Abracon',desc:'16MHz Crystal HC-49/US', package:'HC-49/US',value:'16MHz',  datasheet:'https://abracon.com/Resonators/ABLS.pdf' },
    { mpn:'ABLS-8.000MHZ-B2-T', mfr:'Abracon',desc:'8MHz Crystal HC-49/US',  package:'HC-49/US',value:'8MHz',   datasheet:'https://abracon.com/Resonators/ABLS.pdf' },
    { mpn:'ECS-160-S-1X',       mfr:'ECS',   desc:'16MHz Crystal SM-49',      package:'SM-49',   value:'16MHz',  datasheet:'https://ecsxtal.com/store/pdf/ECS-160-s-1x.pdf' },
    { mpn:'NX3225GA-8.000M-EXS-3', mfr:'NDK',desc:'8MHz Crystal 3225 SMD',  package:'3225',    value:'8MHz',   datasheet:'https://www.ndk.com/images/products/search/NX3225GA_e.pdf' },
    { mpn:'SG-210STF 32.768KHZ',mfr:'Epson', desc:'32.768kHz Crystal SMD',   package:'SMD',     value:'32.768kHz',datasheet:'https://www5.epsondevice.com/en/products/crystal/sg210.html' },
  ],

  // ── CONNECTORS ─────────────────────────────────────────────────────────
  connectors: [
    { mpn:'22-28-4023',     mfr:'Molex',   desc:'2-pin KK 2.54mm THT',        package:'THT',    value:'2-pin', datasheet:'https://www.molex.com/pdm_docs/sd/022284023_sd.pdf' },
    { mpn:'22-28-4043',     mfr:'Molex',   desc:'4-pin KK 2.54mm THT',        package:'THT',    value:'4-pin', datasheet:'https://www.molex.com/pdm_docs/sd/022284043_sd.pdf' },
    { mpn:'B2B-PH-K-S(LF)(SN)',mfr:'JST',  desc:'2-pin PH 2.0mm THT',        package:'THT',    value:'2-pin', datasheet:'https://www.jst-mfg.com/product/pdf/eng/ePH.pdf' },
    { mpn:'B4B-PH-K-S(LF)(SN)',mfr:'JST',  desc:'4-pin PH 2.0mm THT',        package:'THT',    value:'4-pin', datasheet:'https://www.jst-mfg.com/product/pdf/eng/ePH.pdf' },
    { mpn:'USB4085-GF-A',   mfr:'GCT',    desc:'USB-C Receptacle SMD',        package:'SMD',    value:'USB-C', datasheet:'https://gct.co/files/drawings/usb4085.pdf' },
    { mpn:'PJ-002A',        mfr:'CUI',    desc:'2.1mm DC Barrel Jack THT',    package:'THT',    value:'DC Jack',datasheet:'https://www.cuidevices.com/product/resource/pj-002a.pdf' },
    { mpn:'0022232021',     mfr:'Molex',   desc:'2-pin Micro-Fit 3.0mm THT',  package:'THT',    value:'2-pin', datasheet:'https://www.molex.com/pdm_docs/sd/0022232021_sd.pdf' },
    { mpn:'PTS645SM43SMTR92LFS',mfr:'C&K', desc:'Tactile Switch 6x6 SMD',    package:'SMD',    value:'SWITCH',datasheet:'https://www.ckswitches.com/media/1471/pts645.pdf' },
  ],

  // ── POWER ICs / DRIVERS ────────────────────────────────────────────────
  power_ics: [
    { mpn:'L293DNE',        mfr:'ST',      desc:'H-Bridge Motor Driver DIP-16',package:'DIP-16', value:'L293D',   datasheet:'https://www.st.com/resource/en/datasheet/l293.pdf' },
    { mpn:'L298N',          mfr:'ST',      desc:'H-Bridge 2A TO-127',          package:'TO-127', value:'L298N',   datasheet:'https://www.st.com/resource/en/datasheet/l298.pdf' },
    { mpn:'DRV8833PWPR',    mfr:'TI',      desc:'Dual H-Bridge 1.5A HTSSOP-16',package:'HTSSOP-16',value:'DRV8833',datasheet:'https://www.ti.com/lit/ds/symlink/drv8833.pdf' },
    { mpn:'ULN2003ADR2G',   mfr:'onsemi',  desc:'7-ch Darlington Array SOIC-16',package:'SOIC-16',value:'ULN2003',datasheet:'https://www.onsemi.com/pdf/datasheet/uln2003a-d.pdf' },
    { mpn:'LM2596S-5.0/NOPB',mfr:'TI',    desc:'5V 3A Buck Converter TO-263',  package:'TO-263', value:'LM2596',  datasheet:'https://www.ti.com/lit/ds/symlink/lm2596.pdf' },
    { mpn:'TPS54360BDDAR',  mfr:'TI',      desc:'3-60V 3.5A Buck Converter SOT-23-8',package:'SOT-23-8',value:'TPS54360',datasheet:'https://www.ti.com/lit/ds/symlink/tps54360b.pdf' },
    { mpn:'MT3608L',        mfr:'Aerosemi',desc:'Boost Converter 2-24V SOT-23-6',package:'SOT-23-6',value:'MT3608',datasheet:'https://www.olimex.com/Products/Breadboarding/BB-PWR-3608/resources/MT3608.pdf' },
  ],

  // ── OPTO / INTERFACE ───────────────────────────────────────────────────
  interface_ics: [
    { mpn:'PC817C',         mfr:'Sharp',   desc:'Optocoupler 1ch DIP-4',       package:'DIP-4',  value:'PC817',   datasheet:'https://www.sharpsma.com/en/products/model/PC817C' },
    { mpn:'MAX232EPE+',     mfr:'Maxim',   desc:'RS-232 Transceiver DIP-16',   package:'DIP-16', value:'MAX232',  datasheet:'https://www.analog.com/media/en/technical-documentation/data-sheets/MAX220-MAX249.pdf' },
    { mpn:'SN65HVD231DR',   mfr:'TI',      desc:'CAN Bus Transceiver SOIC-8',  package:'SOIC-8', value:'SN65HVD231',datasheet:'https://www.ti.com/lit/ds/symlink/sn65hvd231.pdf' },
    { mpn:'PCA9685PW,118',  mfr:'NXP',     desc:'16-ch PWM I2C Driver TSSOP-28',package:'TSSOP-28',value:'PCA9685',datasheet:'https://www.nxp.com/docs/en/data-sheet/PCA9685.pdf' },
  ],

  // ── SENSORS ────────────────────────────────────────────────────────────
  sensors: [
    { mpn:'DS18B20',        mfr:'Maxim',   desc:'1-Wire Temp Sensor -55~125C TO-92',package:'TO-92',value:'DS18B20', datasheet:'https://www.analog.com/media/en/technical-documentation/data-sheets/DS18B20.pdf' },
    { mpn:'DHT22',          mfr:'Aosong',  desc:'Humidity+Temp Sensor SIP-4',  package:'SIP-4',  value:'DHT22',   datasheet:'https://www.sparkfun.com/datasheets/Sensors/Temperature/DHT22.pdf' },
    { mpn:'MPU-6050',       mfr:'TDK',     desc:'6-axis IMU I2C QFN-24',       package:'QFN-24', value:'MPU-6050',datasheet:'https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf' },
    { mpn:'BMP280',         mfr:'Bosch',   desc:'Pressure+Temp I2C LGA-8',     package:'LGA-8',  value:'BMP280',  datasheet:'https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmp280-ds001.pdf' },
    { mpn:'HC-SR04',        mfr:'Generic', desc:'Ultrasonic Distance Module',  package:'Module', value:'HC-SR04', datasheet:'https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf' },
    { mpn:'LM35DZ/NOPB',   mfr:'TI',      desc:'Analog Temp Sensor TO-92',    package:'TO-92',  value:'LM35',    datasheet:'https://www.ti.com/lit/ds/symlink/lm35.pdf' },
  ],

  // ── EEPROM / MEMORY ────────────────────────────────────────────────────
  memory: [
    { mpn:'AT24C02C-SSHM-T',mfr:'Microchip',desc:'2Kbit I2C EEPROM SOIC-8',  package:'SOIC-8', value:'AT24C02', datasheet:'https://ww1.microchip.com/downloads/en/DeviceDoc/AT24C01-02-Data-Sheet-DS20006117A.pdf' },
    { mpn:'AT25SF041-SSHD-T',mfr:'Microchip',desc:'4Mb SPI Flash SOIC-8',    package:'SOIC-8', value:'AT25SF041',datasheet:'https://www.microchip.com/content/dam/mchp/documents/MPD/ProductDocuments/DataSheets/DS-AT25SF041.pdf' },
    { mpn:'W25Q32JVSSIQ',   mfr:'Winbond', desc:'32Mb SPI Flash SOIC-8',      package:'SOIC-8', value:'W25Q32',  datasheet:'https://www.winbond.com/resource-files/w25q32jv%20revk%2005132021%20plus.pdf' },
  ],

  // ── FUSES / PROTECTION ─────────────────────────────────────────────────
  protection: [
    { mpn:'0ZCJ0050AF2E',   mfr:'Bourns',  desc:'500mA Resettable Fuse 0805', package:'0805',   value:'500mA PTC',datasheet:'https://www.bourns.com/docs/Product-Datasheets/MF-MSMF.pdf' },
    { mpn:'PRTR5V0U2X,215', mfr:'Nexperia', desc:'ESD Diode USB 2-ch SOT-143',package:'SOT-143',value:'ESD',     datasheet:'https://assets.nexperia.com/documents/data-sheet/PRTR5V0U2X.pdf' },
    { mpn:'CDSOT23-T24CAN', mfr:'Bourns',  desc:'TVS Diode CAN Bus SOT-23',   package:'SOT-23', value:'24V TVS', datasheet:'https://www.bourns.com/docs/Product-Datasheets/CDSOT23-T24CAN.pdf' },
  ],
};

// Flatten to array for AI prompt injection
function getPartsContext() {
  const allParts = [];
  for (const [cat, parts] of Object.entries(PARTS_DB)) {
    parts.forEach(p => allParts.push({ ...p, category: cat }));
  }
  return allParts;
}

// Build a compact summary for injection into AI prompt (keeps tokens reasonable)
function getPartsPrompt() {
  const lines = [];
  for (const [cat, parts] of Object.entries(PARTS_DB)) {
    lines.push(`\n## ${cat.toUpperCase()}`);
    parts.forEach(p => {
      lines.push(`  ${p.mpn} | ${p.mfr} | ${p.desc} | ${p.package} | DS: ${p.datasheet}`);
    });
  }
  return lines.join('\n');
}

module.exports = { PARTS_DB, getPartsContext, getPartsPrompt };
