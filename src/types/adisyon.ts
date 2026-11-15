export type ItemStatus = "BEKLIYOR" | "HAZIRLANIYOR" | "HAZIR" | "TESLIM_EDILDI";

export type AdisyonStatus =
  | "BEKLIYOR"
  | "HAZIRLANIYOR"
  | "HAZIR"
  | "TESLIM_EDILDI"
  | "IPTAL";

export type MenuCategory =
  | "Omletler"
  | "Sahanda & Yumurta"
  | "Börek & Pişi"
  | "Tost & Ekmek"
  | "Pankek & Krep"
  | "Sıcak Spesiyal";

export type VariationSelectionMode = "none" | "single" | "multi";

export interface MenuItem {
  id: number;
  productNo: number;
  name: string;
  category: MenuCategory;
  variations: string[];
  selectionMode: VariationSelectionMode;
  isActive: boolean;
}

export interface DraftAdisyonItem {
  draftId: string;
  menuItemId: number;
  productNo: number;
  productName: string;
  category: MenuCategory;
  variations: string[];
  quantity: number;
  itemNote: string;
}

export interface AdisyonItem {
  id: number;
  adisyonId: number;
  menuItemId: number;
  productNo: number;
  productName: string;
  category: string;
  variations: string[];
  quantity: number;
  itemNote: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Adisyon {
  id: number;
  queueNumber: number;
  /** Masa numarası ("101"–"133"); masa özelliğinden önceki eski kayıtlarda "" */
  tableNumber: string;
  roomNumber: string;
  guestName: string;
  note: string;
  status: AdisyonStatus;
  printedAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  items: AdisyonItem[];
}

export interface GroupedVariationBreakdown {
  variationKey: string;
  variations: string[];
  totalQuantity: number;
  waitingQuantity: number;
  preparingQuantity: number;
  readyQuantity: number;
  itemIds: number[];
  orders: Array<{
    adisyonId: number;
    queueNumber: number;
    tableNumber: string;
    roomNumber: string;
    guestName: string;
    itemId: number;
    quantity: number;
    status: ItemStatus;
    itemNote: string;
  }>;
}

export interface GroupedProductBatch {
  productNo: number;
  productName: string;
  category: string;
  totalQuantity: number;
  pendingQuantity: number;
  preparingQuantity: number;
  readyQuantity: number;
  breakdowns: GroupedVariationBreakdown[];
}

export type DbMode = "postgres" | "fallback";

export type UserRole = "ADMIN" | "SIPARIS" | "MUTFAK";

export interface AuthUser {
  username: string;
  displayName: string;
  role: UserRole;
}

export interface DetectedSystemPrinter {
  name: string;
  driverName: string;
  portName: string;
  isVirtual: boolean;
}

export interface PrinterConfig {
  enabled: boolean;
  printerName: string;
  autoPrint: boolean;
}

export interface AdisyonsApiResponse {
  adisyons: Adisyon[];
  groupedBatches: GroupedProductBatch[];
  printerConfig: PrinterConfig;
  hasActivePrinter: boolean;
  dbMode: DbMode;
  dbNotice?: string;
}
