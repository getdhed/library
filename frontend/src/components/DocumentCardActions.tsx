import React from "react";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { documentFileUrl } from "../api/library";
import {
  cardActionIconButtonActiveSx,
  cardActionIconButtonSx,
} from "./mui-primitives";

type ActionableDocument = {
  id: number;
  updatedAt: string;
  isFavorite: boolean;
};

type DocumentCardActionsProps = {
  item: ActionableDocument;
  token?: string | null;
  onOpen: (id: number) => void | Promise<void>;
  onToggleFavorite: (id: number, isFavorite: boolean) => void | Promise<void>;
};

const DocumentCardActions: React.FC<DocumentCardActionsProps> = ({
  item,
  token,
  onOpen,
  onToggleFavorite,
}) => {
  const openHref = documentFileUrl(
    item.id,
    token ?? "",
    false,
    `${item.updatedAt}-${Date.now()}`
  );
  const favoriteLabel = item.isFavorite
    ? "Убрать из избранного"
    : "Добавить в избранное";

  function handleQuickOpen(event: React.MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    void onOpen(item.id);
    window.open(openHref, "_blank", "noopener,noreferrer");
  }

  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      <Tooltip title="Открыть документ" arrow>
        <IconButton
          component="a"
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleQuickOpen}
          aria-label="Открыть документ"
          sx={cardActionIconButtonSx}
        >
          <OpenInNewRoundedIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={favoriteLabel} arrow>
        <IconButton
          type="button"
          onClick={() => void onToggleFavorite(item.id, item.isFavorite)}
          aria-label={favoriteLabel}
          sx={[
            cardActionIconButtonSx,
            item.isFavorite && cardActionIconButtonActiveSx,
          ]}
        >
          {item.isFavorite ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export default DocumentCardActions;
