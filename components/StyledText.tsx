import { Text, TextProps } from "./Themed";

export function MonoText(props: TextProps) {
  const { className, ...otherProps } = props;
  return <Text {...otherProps} className={`font-mono ${className || ""}`} />;
}
