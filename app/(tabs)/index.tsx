import { useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";

const PAPER_W = 794;
const PAPER_H = 1123;

type Page = {
  id: number;
  title: string;
  accent: string;
  blocks: string[];
};

const seedPages: Page[] = [
  { id: 1, title: "الغلاف", accent: "#0E4F46", blocks: ["مستند A4", "محرر وطباعة"] },
  { id: 2, title: "المحتوى", accent: "#D4A72C", blocks: ["العنوان الرئيسي", "اكتب النص هنا"] },
  { id: 3, title: "الصور", accent: "#A7634B", blocks: ["مساحة الصورة", "ملاحظات إضافية"] },
];

export default function HomeScreen() {
  const [pages, setPages] = useState(seedPages);
  const [activeId, setActiveId] = useState(1);
  const [history, setHistory] = useState<Page[][]>([]);
  const [future, setFuture] = useState<Page[][]>([]);
  const [dark, setDark] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fileName, setFileName] = useState("مستند جديد");
  const active = pages.find((page) => page.id === activeId) ?? pages[0];
  const screenWidth = Dimensions.get("window").width;
  const paperWidth = Math.min(screenWidth - 48, 420);
  const paperHeight = paperWidth * (PAPER_H / PAPER_W);
  const colors = dark ? darkColors : lightColors;

  const commit = (next: Page[]) => {
    setHistory((items) => [...items.slice(-19), pages]);
    setFuture([]);
    setPages(next);
  };

  const updateActive = (patch: Partial<Page>) => {
    commit(pages.map((page) => (page.id === activeId ? { ...page, ...patch } : page)));
  };

  const addPage = () => {
    const id = Math.max(...pages.map((page) => page.id), 0) + 1;
    const next = [...pages, { id, title: `صفحة ${id}`, accent: "#527C72", blocks: ["عنوان جديد", "نص جديد"] }];
    commit(next);
    setActiveId(id);
  };

  const deletePage = () => {
    if (pages.length === 1) return Alert.alert("لا يمكن الحذف", "يجب أن يبقى مستندك صفحة واحدة على الأقل.");
    const index = pages.findIndex((page) => page.id === activeId);
    const next = pages.filter((page) => page.id !== activeId);
    commit(next);
    setActiveId(next[Math.max(0, index - 1)].id);
  };

  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setFuture((items) => [...items, pages]);
    setHistory((items) => items.slice(0, -1));
    setPages(previous);
    setActiveId(previous[0]?.id ?? 1);
  };

  const redo = () => {
    const next = future[future.length - 1];
    if (!next) return;
    setHistory((items) => [...items, pages]);
    setFuture((items) => items.slice(0, -1));
    setPages(next);
    setActiveId(next[0]?.id ?? 1);
  };

  const share = async () => {
    try {
      const html = `<html dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"/><style>@page{size:A4;margin:0}body{margin:0;font-family:Arial;color:#182521}.page{height:297mm;width:210mm;box-sizing:border-box;padding:28mm 22mm;page-break-after:always}.band{height:5mm;background:#0E4F46;margin:-28mm -22mm 20mm}.title{font-size:28pt;font-weight:700}.body{font-size:15pt;color:#59645F;margin-top:16mm}.footer{position:absolute;bottom:15mm;color:#9BA39D;font-size:9pt}</style></head><body>${pages.map((page) => `<section class="page"><div class="band"/><div>محرر وطباعة A4</div><div class="title">${page.blocks[0]}</div><div class="body">${page.blocks[1]}</div><div class="footer">${page.title}</div></section>`).join("")}</body></html>`;
      const result = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(result.uri, { mimeType: "application/pdf", dialogTitle: "مشاركة ملف PDF" });
      else Alert.alert("تم إنشاء PDF", "يمكنك طباعته من نافذة المشاركة في جهازك.");
    } catch {
      Alert.alert("تعذر إنشاء PDF", "حاول مرة أخرى بعد حفظ التعديلات.");
    }
  };
  const importPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (result.canceled) return;
    const name = result.assets[0]?.name ?? "مستند PDF";
    setFileName(name);
    Alert.alert("تم استيراد الملف", "تم فتح الملف داخل مساحة العمل. أضف الصفحات أو حررها من المعاينات.");
  };
  const previewLabel = useMemo(() => `${pages.length} صفحات · الصفحة ${pages.findIndex((page) => page.id === activeId) + 1}`, [pages, activeId]);

  return (
    <ScreenContainer style={{ backgroundColor: colors.bg }}>
      <View style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.kicker, { color: colors.muted }]}>{fileName}</Text>
            <Text style={[styles.title, { color: colors.ink }]}>محرر وطباعة A4</Text>
          </View>
          <Pressable onPress={() => setDark((value) => !value)} style={[styles.iconButton, { backgroundColor: colors.card }]}>
            <Text style={{ fontSize: 18 }}>{dark ? "☀" : "◐"}</Text>
          </Pressable>
        </View>

        <View style={styles.toolbar}>
          <Pressable onPress={importPdf} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.primaryText}>＋ استيراد PDF</Text>
          </Pressable>
          <Pressable onPress={share} style={[styles.outlineButton, { borderColor: colors.primary }]}>
            <Text style={[styles.outlineText, { color: colors.primary }]}>مشاركة</Text>
          </Pressable>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.muted }]}>{previewLabel}</Text>
          <View style={styles.historyRow}>
            <Pressable disabled={!history.length} onPress={undo}><Text style={[styles.historyText, { color: history.length ? colors.primary : colors.disabled }]}>↶ تراجع</Text></Pressable>
            <Pressable disabled={!future.length} onPress={redo}><Text style={[styles.historyText, { color: future.length ? colors.primary : colors.disabled }]}>↷ إعادة</Text></Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
          {pages.map((page, index) => (
            <Pressable key={page.id} onPress={() => setActiveId(page.id)} style={[styles.thumbWrap, activeId === page.id && { borderColor: colors.primary, backgroundColor: colors.tint }]}>
              <View style={[styles.thumbPaper, { backgroundColor: "#FFFDF8" }]}>
                <View style={[styles.thumbBand, { backgroundColor: page.accent }]} />
                <Text style={styles.thumbHeading}>{page.blocks[0]}</Text>
                <View style={styles.thumbLines}><View /><View /><View /></View>
              </View>
              <Text style={[styles.thumbLabel, { color: colors.ink }]}>{index + 1}</Text>
            </Pressable>
          ))}
          <Pressable onPress={addPage} style={[styles.addThumb, { borderColor: colors.border, backgroundColor: colors.card }]}><Text style={[styles.addPlus, { color: colors.primary }]}>＋</Text><Text style={[styles.addLabel, { color: colors.muted }]}>صفحة</Text></Pressable>
        </ScrollView>

        <ScrollView contentContainerStyle={styles.canvasArea} showsVerticalScrollIndicator={false}>
          <View style={[styles.paper, { width: paperWidth, height: paperHeight, backgroundColor: "#FFFDF8", shadowColor: colors.ink }]}>
            <View style={[styles.paperBand, { backgroundColor: active.accent }]} />
            <Text style={styles.pageNumber}>صفحة {pages.findIndex((page) => page.id === activeId) + 1}</Text>
            <View style={styles.paperContent}>
              <Text style={styles.paperEyebrow}>محرر وطباعة A4</Text>
              <Text style={styles.paperTitle}>{active.blocks[0]}</Text>
              <View style={styles.rule} />
              <Text style={styles.paperBody}>{active.blocks[1]}</Text>
              <View style={styles.photoPlaceholder}><Text style={styles.photoIcon}>▧</Text><Text style={styles.photoText}>اضغط لإضافة صورة</Text></View>
              <Text style={styles.paperFooter}>A4 · {active.title}</Text>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.bottomBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <Pressable onPress={deletePage} style={styles.tool}><Text style={styles.toolIcon}>⌫</Text><Text style={[styles.toolText, { color: colors.muted }]}>حذف</Text></Pressable>
          <Pressable onPress={() => setEditing((value) => !value)} style={[styles.editAction, { backgroundColor: colors.primary }]}><Text style={styles.editIcon}>✎</Text><Text style={styles.editText}>{editing ? "إغلاق التحرير" : "تحرير الصفحة"}</Text></Pressable>
          <Pressable onPress={addPage} style={styles.tool}><Text style={styles.toolIcon}>＋</Text><Text style={[styles.toolText, { color: colors.muted }]}>إضافة</Text></Pressable>
        </View>

        {editing && <View style={[styles.editPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.panelTitle, { color: colors.ink }]}>خصائص الصفحة الحالية</Text>
          <TextInput value={active.blocks[0]} onChangeText={(text) => updateActive({ blocks: [text, active.blocks[1]] })} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} placeholder="عنوان الصفحة" />
          <TextInput value={active.blocks[1]} onChangeText={(text) => updateActive({ blocks: [active.blocks[0], text] })} style={[styles.input, { color: colors.ink, borderColor: colors.border }]} placeholder="النص" />
        </View>}
      </View>
    </ScreenContainer>
  );
}

const lightColors = { bg: "#F2EEE7", card: "#FFFCF6", ink: "#1C2825", muted: "#7B827C", border: "#DED8CC", primary: "#0E4F46", tint: "#E0EEE9", disabled: "#B9BDB8" };
const darkColors = { bg: "#17211F", card: "#22302C", ink: "#F4F1E8", muted: "#AAB7B0", border: "#3B4A45", primary: "#66B6A3", tint: "#29443D", disabled: "#65736D" };

const styles = StyleSheet.create({
  safe: { flex: 1 }, header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 }, kicker: { fontSize: 12, letterSpacing: 1 }, title: { fontSize: 24, fontWeight: "800", marginTop: 2 }, iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }, toolbar: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 14 }, primaryButton: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" }, primaryText: { color: "#FFFDF8", fontWeight: "800", fontSize: 14 }, outlineButton: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 22, justifyContent: "center" }, outlineText: { fontWeight: "800" }, metaRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 15, alignItems: "center" }, meta: { fontSize: 13 }, historyRow: { flexDirection: "row", gap: 14 }, historyText: { fontSize: 13, fontWeight: "700" }, thumbnails: { paddingHorizontal: 20, gap: 10, paddingVertical: 12 }, thumbWrap: { width: 74, padding: 4, borderRadius: 12, borderWidth: 1, borderColor: "transparent", alignItems: "center" }, thumbPaper: { width: 62, height: 78, borderRadius: 5, padding: 7, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 }, thumbBand: { height: 5, borderRadius: 2, marginBottom: 8 }, thumbHeading: { fontSize: 6, fontWeight: "800", color: "#24302C" }, thumbLines: { gap: 4, marginTop: 7 }, thumbLabel: { fontWeight: "800", fontSize: 12, marginTop: 3 }, addThumb: { width: 74, height: 105, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }, addPlus: { fontSize: 24, fontWeight: "300" }, addLabel: { fontSize: 11, marginTop: 2 }, canvasArea: { alignItems: "center", paddingVertical: 10, paddingBottom: 126 }, paper: { borderRadius: 3, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }, paperBand: { height: 12 }, pageNumber: { position: "absolute", right: 18, top: 24, fontSize: 10, color: "#8E968F" }, paperContent: { paddingHorizontal: "10%", paddingTop: "15%", flex: 1 }, paperEyebrow: { fontSize: 11, color: "#0E4F46", letterSpacing: 1, fontWeight: "800" }, paperTitle: { fontSize: 31, fontWeight: "800", color: "#182521", marginTop: 12 }, rule: { height: 2, backgroundColor: "#D4A72C", width: "34%", marginTop: 18 }, paperBody: { fontSize: 16, color: "#59645F", marginTop: 20 }, photoPlaceholder: { marginTop: 40, height: "34%", borderRadius: 12, borderWidth: 1, borderColor: "#D5D0C6", borderStyle: "dashed", alignItems: "center", justifyContent: "center", backgroundColor: "#F6F1E8" }, photoIcon: { fontSize: 32, color: "#9DA49E" }, photoText: { color: "#7B827C", fontSize: 12, marginTop: 7 }, paperFooter: { position: "absolute", bottom: 22, left: "10%", color: "#9BA39D", fontSize: 10 }, bottomBar: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 82, borderTopWidth: 1, paddingHorizontal: 18, paddingBottom: 12, paddingTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, tool: { alignItems: "center", minWidth: 54 }, toolIcon: { fontSize: 21, color: "#7B827C" }, toolText: { fontSize: 11, marginTop: 2 }, editAction: { flex: 1, marginHorizontal: 16, borderRadius: 14, paddingVertical: 13, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }, editIcon: { color: "#FFFDF8", fontSize: 18 }, editText: { color: "#FFFDF8", fontWeight: "800", fontSize: 14 }, editPanel: { position: "absolute", left: 16, right: 16, bottom: 92, borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }, panelTitle: { fontSize: 15, fontWeight: "800" }, input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
});
