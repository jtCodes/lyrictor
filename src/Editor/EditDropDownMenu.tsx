import { MenuTrigger, ActionButton, Menu, Item } from "@adobe/react-spectrum";
import MoreSmallListVert from "@spectrum-icons/workflow/MoreSmallListVert";
import { Keyboard, Text } from "@adobe/react-spectrum";
import Copy from "@spectrum-icons/workflow/Copy";
import Paste from "@spectrum-icons/workflow/Paste";
import CutIcon from "@spectrum-icons/workflow/Cut";
import DeleteIcon from "@spectrum-icons/workflow/Delete";
import UndoIcon from "@spectrum-icons/workflow/Undo";
import TextBulleted from "@spectrum-icons/workflow/TextBulleted";
import TextAdd from "@spectrum-icons/workflow/TextAdd";
import { headerButtonStyle, HEADER_BUTTON_CLASS } from "../theme";

export type EditOptionType =
  | "delete"
  | "undo"
  | "copy"
  | "paste"
  | "cut"
  | "select-all-text";
export type ToolsMenuOptionType = EditOptionType | "timeline-list-view";

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

export default function EditDropDownMenu({
  onItemClick,
}: {
  onItemClick: (option: ToolsMenuOptionType) => void;
}) {
  const getKeyboardShortcut = (action: EditOptionType) => {
    if (isMac) {
      switch (action) {
        case "delete":
          return "←"; // or "⌫" if you prefer using the Backspace key
        case "undo":
          return "⌘Z";
        case "copy":
          return "⌘C";
        case "cut":
          return "X";
        case "paste":
          return "⌘V";
        default:
          return "";
      }
    } else {
      switch (action) {
        case "delete":
          return "←"; // or "Backspace" if you prefer
        case "undo":
          return "Ctrl+Z";
        case "copy":
          return "Ctrl+C";
        case "cut":
          return "X";
        case "paste":
          return "Ctrl+V";
        default:
          return "";
      }
    }
  };

  return (
    <MenuTrigger>
      <ActionButton
        aria-label="Edit menu"
        UNSAFE_className={HEADER_BUTTON_CLASS}
        UNSAFE_style={{
          ...headerButtonStyle(false),
          width: 30,
          minWidth: 30,
          height: 28,
          minHeight: 28,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MoreSmallListVert aria-label="edit" size="S" />
      </ActionButton>
      <Menu onAction={(key: any) => onItemClick(key)}>
        <Item key="undo" textValue="undo">
          <UndoIcon />
          <Text>Undo</Text>
          <Keyboard>{getKeyboardShortcut("undo")}</Keyboard>
        </Item>
        <Item key="copy" textValue="copy">
          <Copy />
          <Text>Copy</Text>
          <Keyboard>{getKeyboardShortcut("copy")}</Keyboard>
        </Item>
        <Item key="cut" textValue="cut">
          <CutIcon />
          <Text>Cut</Text>
          <Keyboard>{getKeyboardShortcut("cut")}</Keyboard>
        </Item>
        <Item key="paste" textValue="paste">
          <Paste />
          <Text>Paste</Text>
          <Keyboard>{getKeyboardShortcut("paste")}</Keyboard>
        </Item>
        <Item key="delete" textValue="delete">
          <DeleteIcon />
          <Text>Delete</Text>
          <Keyboard>{getKeyboardShortcut("delete")}</Keyboard>
        </Item>
        <Item key="select-all-text" textValue="select-all-text">
          <TextAdd />
          <Text>Select All Text</Text>
        </Item>
        <Item key="timeline-list-view" textValue="timeline-list-view">
          <TextBulleted />
          <Text>List View</Text>
        </Item>
      </Menu>
    </MenuTrigger>
  );
}
