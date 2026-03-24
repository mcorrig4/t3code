import { T3LoaderMarkup, type T3LoaderMarkupProps } from "./T3LoaderMarkup";

export type T3LoaderProps = T3LoaderMarkupProps;

export default function T3Loader(props: T3LoaderProps) {
  return <T3LoaderMarkup {...props} />;
}
