import { MenuTrigger, ActionButton, Menu, Item } from "@adobe/react-spectrum";
import ChevronDown from "@spectrum-icons/workflow/ChevronDown";
import { Keyboard, Text } from "@adobe/react-spectrum";
import Copy from "@spectrum-icons/workflow/Copy";
import Paste from "@spectrum-icons/workflow/Paste";
import DeleteIcon from "@spectrum-icons/workflow/Delete";
import UndoIcon from "@spectrum-icons/workflow/Undo";

export type EditOptionType = "delete" | "undo" | "copy" | "paste";

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

export default function EditDropDownMenu({
  onItemClick,
}: {
  onItemClick: (option: EditOptionType) => void;
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
        UNSAFE_style={{
          fontSize: 13,
          height: "max-content",
          padding: "1.5px 5.5px",
        }}
      >
        Edit
        <ChevronDown
          aria-label="edit"
          UNSAFE_style={{ padding: 0, opacity: "0.8", paddingLeft: 2.5 }}
        />
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
      </Menu>
    </MenuTrigger>
  );
}
