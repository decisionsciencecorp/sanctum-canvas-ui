/**
 * A6.1–A6.3 — Register form components.
 */

import { Form } from "./Form.js";
import { FormControl } from "./FormControl.js";
import { Label, Description } from "./Label.js";
import { Submit, Reset } from "./Submit.js";
import { Input } from "./Input.js";
import { TextArea } from "./TextArea.js";
import { DatePicker } from "./DatePicker.js";
import { Slider } from "./Slider.js";
import { Select, SelectItem } from "./Select.js";
import {
  CheckBoxGroup,
  CheckBoxItem,
  CheckboxGroup,
  CheckboxItem,
} from "./CheckBoxGroup.js";
import { RadioGroup, RadioItem } from "./RadioGroup.js";
import { SwitchGroup, SwitchItem } from "./SwitchGroup.js";
import { Chips, ChipItem } from "./Chips.js";
import { OptionCards, OptionCard } from "./OptionCards.js";

/** @type {Record<string, import("../../renderer/registry.js").ComponentEntry>} */
export const FORM_COMPONENTS = {
  Form,
  FormControl,
  Label,
  Description,
  Submit,
  Reset,
  Input,
  TextArea,
  DatePicker,
  Slider,
  Select,
  SelectItem,
  CheckBoxGroup,
  CheckBoxItem,
  CheckboxGroup,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  SwitchGroup,
  SwitchItem,
  Chips,
  ChipItem,
  OptionCards,
  OptionCard,
};

/**
 * @param {{ register: (type: string, entry: unknown) => void }} registry
 */
export function registerForms(registry) {
  if (!registry || typeof registry.register !== "function") {
    throw new Error("registerForms: registry with register() required");
  }
  for (const [type, entry] of Object.entries(FORM_COMPONENTS)) {
    registry.register(type, entry);
  }
  return registry;
}

export {
  Form,
  FormControl,
  Label,
  Description,
  Submit,
  Reset,
  Input,
  TextArea,
  DatePicker,
  Slider,
  Select,
  SelectItem,
  CheckBoxGroup,
  CheckBoxItem,
  CheckboxGroup,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  SwitchGroup,
  SwitchItem,
  Chips,
  ChipItem,
  OptionCards,
  OptionCard,
};

export default registerForms;
