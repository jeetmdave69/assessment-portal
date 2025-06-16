import { Icon } from '@iconify/react';
import { Box } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

type IconifyProps = {
  icon: string;
  width?: number | string;
  color?: string;
  sx?: SxProps<Theme>;
};

export default function Iconify({ icon, width = 24, color, sx }: IconifyProps) {
  return <Box component={Icon} icon={icon} width={width} color={color} sx={sx} />;
}
