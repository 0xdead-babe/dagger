export enum AppView {
  RESOURCES = "resources",
  TAGS = "tags",
  SETTINGS = "settings",
}

export const ERROR_MESSAGES = {
  URL_REQUIRED: "URL is required.",
  TITLE_REQUIRED: "Title is required.",
  INVALID_URL: "Must be a valid URL.",
  TAG_NAME_REQUIRED: "Tag Name is required.",
  INVALID_COLOR_FORMAT: "Invalid color format.",
  NETWORK_ERROR: "Failed to fetch title (CORS issue or network error).",
  TITLE_NOT_DETECTED: "Could not detect title. Please enter manually.",
  DELETE_TAG_CONFIRMATION:
    "Are you sure you want to delete this tag? This action cannot be undone.",
  DELETE_RESOURCE_CONFIRMATION:
    "Are you sure you want to delete this bookmark?",
};
