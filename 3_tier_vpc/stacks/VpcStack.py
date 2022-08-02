"""
# --*-- coding: utf-8 --*--
"""


from aws_cdk import (
    Stack,
    aws_ec2 as ec2,
    Tags,
    CfnOutput,
)
from constructs import Construct


class VpcStack(Stack):
    """Create a VPC with 3 tiers"""

    def __init__(self, scope: Construct, construct_id: str, props: dict, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        self.vpc = ec2.Vpc(
            self,
            id=construct_id,
            cidr=props["vpc_cidr"],
            max_azs=2,
            nat_gateways=1,
            subnet_configuration=[
                {"cidrMark": 24, "name": "Public-", "subnetType": ec2.SubnetType.PUBLIC},
                {"cidrMark": 24, "name": "Private-", "subnetType": ec2.SubnetType.PRIVATE_WITH_NAT},
                {"cidrMark": 24, "name": "Isolated-", "subnetType": ec2.SubnetType.PRIVATE_ISOLATED},
            ],
        )

        # Tag the VPC and output the VPC ID
        Tags.of(self.vpc).add("Name", props["name"])
        CfnOutput(self, "VpcId", value=self.vpc.vpc_id, export_name="VpcId")

        # Tag the VPC's public subnets
        for subnet in self.vpc.public_subnets:
            Tags.of(subnet).add("Name", f"{props['name']}-public-{subnet.availability_zone}")
            CfnOutput(
                self,
                f"PublicSubnet-{subnet.availability_zone}",
                value=subnet.subnet_id,
                export_name=f"PublicSubnet-{subnet.availability_zone}",
            )

        # Tag the VPC's private subnets
        for subnet in self.vpc.private_subnets:
            Tags.of(subnet).add("Name", f"{props['name']}-private-{subnet.availability_zone}")
            CfnOutput(
                self,
                f"PrivateSubnet-{subnet.availability_zone}",
                value=subnet.subnet_id,
                export_name=f"PrivateSubnet-{subnet.availability_zone}",
            )

        # Tag the VPC's isolated subnets
        for subnet in self.vpc.isolated_subnets:
            Tags.of(subnet).add("Name", f"{props['name']}-isolated-{subnet.availability_zone}")
            CfnOutput(
                self,
                f"IsolatedSubnet-{subnet.availability_zone}",
                value=subnet.subnet_id,
                export_name=f"IsolatedSubnet-{subnet.availability_zone}",
            )
