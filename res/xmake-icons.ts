export type XmakeIconsId =
  | "xmake-build";

export type XmakeIconsKey =
  | "XmakeBuild";

export enum XmakeIcons {
  XmakeBuild = "xmake-build",
}

export const XMAKE_ICONS_CODEPOINTS: { [key in XmakeIcons]: string } = {
  [XmakeIcons.XmakeBuild]: "61697",
};
