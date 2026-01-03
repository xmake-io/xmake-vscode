export type XmakeIconsId =
  | "xmake-logo"
  | "xmake-build";

export type XmakeIconsKey =
  | "XmakeLogo"
  | "XmakeBuild";

export enum XmakeIcons {
  XmakeLogo = "xmake-logo",
  XmakeBuild = "xmake-build",
}

export const XMAKE_ICONS_CODEPOINTS: { [key in XmakeIcons]: string } = {
  [XmakeIcons.XmakeLogo]: "61697",
  [XmakeIcons.XmakeBuild]: "61698",
};
