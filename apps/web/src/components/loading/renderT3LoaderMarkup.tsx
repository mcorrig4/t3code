import { renderToStaticMarkup } from "react-dom/server";
import { T3LoaderStatic } from "./T3LoaderStatic";

export function renderT3LoaderMarkup() {
  return renderToStaticMarkup(<T3LoaderStatic />);
}
