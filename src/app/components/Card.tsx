import {Box, BoxProps, HStack, Text} from '@chakra-ui/react';
import {ReactNode} from 'react';
import {Link} from 'react-router';

/** The surface every block of content sits on. */
const Card = (props: BoxProps) => (
  <Box background="bg.panel" borderWidth="1px" borderRadius="card" padding={{base: '16px', md: '20px'}} {...props} />
);

/** A card's heading, with an optional link to the page that goes further. */
const CardTitle = ({children, to, linkLabel = 'See all'}: {children: ReactNode; to?: string; linkLabel?: string}) => (
  <HStack justifyContent="space-between" alignItems="baseline" marginBottom="14px">
    <Text fontFamily="heading" fontWeight="semibold" fontSize="md">
      {children}
    </Text>
    {undefined !== to && (
      <Link to={to}>
        <Text fontSize="sm" color="brand.fg" _hover={{textDecoration: 'underline'}}>
          {linkLabel} →
        </Text>
      </Link>
    )}
  </HStack>
);

export {Card, CardTitle};
