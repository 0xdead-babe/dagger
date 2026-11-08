export enum AppView {
  RESOURCES = "resources",
  TAGS = "tags",
  ANALYTICS = "analytics",
  SETTINGS = "settings",
}

export const ERROR_MESSAGES = {
  URL_REQUIRED: "URL is required.",
  TITLE_REQUIRED: "Title is required.",
  INVALID_URL: "Must be a valid URL.",
  TAG_NAME_REQUIRED: "Tag Name is required.",
  INVALID_COLOR_FORMAT: "Invalid color format.",
  NETWORK_ERROR: "Couldn't fetch a title. You can enter one manually.",
  TITLE_NOT_DETECTED: "No page title found. Please enter one manually.",
  DELETE_TAG_CONFIRMATION:
    "Move this tag to Trash? You can restore it from Recovery center.",
  DELETE_RESOURCE_CONFIRMATION:
    "Move this bookmark to Trash? You can restore it from Recovery center.",
};
