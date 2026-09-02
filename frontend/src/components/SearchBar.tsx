import React from "react";
import { Box, IconButton, InputBase, Paper, Button, Typography, type SxProps, type Theme } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";

type DropdownItem = {
  key: string | number;
  label: string;
  type?: string;
  onClick: () => void;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (e?: React.FormEvent) => void;
  placeholder?: string;
  sx?: SxProps<Theme>;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  dropdownItems?: DropdownItem[];
  ariaLabel?: string;
  hideButton?: boolean;
};

const SearchBar: React.FC<Props> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Поиск...",
  sx,
  autoFocus = false,
  onFocus,
  onBlur,
  dropdownItems = [],
  ariaLabel = "Поиск документов",
  hideButton = false,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <Box sx={{ position: "relative", width: "100%", ...sx }}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          width: "100%",
          backgroundColor: "background.paper",
          borderRadius: 0,
          border: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <InputBase
          sx={{ ml: 1.5, flex: 1, py: 0.5 }}
          placeholder={placeholder}
          inputProps={{ "aria-label": ariaLabel }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {!hideButton && (
          <IconButton
            type="submit"
            sx={{ p: 1, borderRadius: 0, color: "primary.main" }}
            aria-label="Искать"
          >
            <SearchIcon />
          </IconButton>
        )}
      </Box>

      {dropdownItems.length > 0 && (
        <Paper
          sx={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 20,
            borderRadius: 0,
            maxHeight: 320,
            overflowY: "auto",
            border: (theme) => `1px solid ${theme.palette.divider}`,
          }}
        >
          {dropdownItems.map((item) => (
            <Button
              key={item.key}
              type="button"
              fullWidth
              color="inherit"
              onClick={item.onClick}
              sx={{
                justifyContent: "flex-start",
                borderRadius: 0,
                px: 1.7,
                py: 1.1,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                "&:last-child": { borderBottom: "none" },
              }}
            >
              <Typography
                component="span"
                sx={{
                  fontSize: 14,
                  fontWeight: 500,
                  lineHeight: 1.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  width: "100%",
                }}
              >
                {item.label}
              </Typography>
              {item.type && (
                <Typography
                  component="span"
                  sx={{
                    fontSize: 11,
                    color: "text.secondary",
                    lineHeight: 1.2,
                    mt: 0.2,
                  }}
                >
                  {item.type}
                </Typography>
              )}
            </Button>
          ))}
        </Paper>
      )}
    </Box>
  );
};

export default SearchBar;
