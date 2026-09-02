import React from "react";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { Link } from "react-router-dom";
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
  onToggleFavorite: (id: number, isFavorite: boolean) => void | Promise<void>;
};

const DocumentCardActions: React.FC<DocumentCardActionsProps> = ({
  item,
  onToggleFavorite,
}) => {
  const favoriteLabel = item.isFavorite
    ? "Убрать из избранного"
    : "Добавить в избранное";

  return (
    <Stack direction="row" spacing={0.8} alignItems="center">
      <Tooltip title="Открыть документ" arrow>
        <IconButton
          component={Link}
          to={`/documents/${item.id}`}
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
          sx={(item.isFavorite ? { ...cardActionIconButtonSx, ...cardActionIconButtonActiveSx } : cardActionIconButtonSx) as any}
        >
          {item.isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
      </Tooltip>
    </Stack>
  );
};

export default DocumentCardActions;
