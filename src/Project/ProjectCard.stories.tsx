import ProjectCard from "./ProjectCard";
import { Meta, Story } from "@storybook/react";

export default {
  title: "Components/ProjectCard",
  component: ProjectCard,
} as Meta;

const Template: Story = (args) => <ProjectCard {...args} />;

export const Default = Template.bind({});
Default.args = {};
